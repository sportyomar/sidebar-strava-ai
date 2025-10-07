import { useState, useCallback } from 'react';

// useChartCommands - Executes chart template commands
export const useChartCommands = (chartTransform) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);
  const [error, setError] = useState(null);
  const [loadedTemplates, setLoadedTemplates] = useState([]);
  const [loadedLayers, setLoadedLayers] = useState([]);

  // Parse natural language using chart-specific API
  const parseWithAI = async (input, context = {}) => {
    const response = await fetch('http://localhost:5002/api/ai-parse-chart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
        context: {
          loaded_templates: loadedTemplates,
          loaded_layers: loadedLayers,
          elements: chartTransform.getAllElementsData(),
          ...context
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  };

  // Execute natural language command
  const executeCommand = useCallback(async (naturalLanguageInput) => {
    if (!naturalLanguageInput?.trim()) {
      setError('Please enter a command');
      return false;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const aiResponse = await parseWithAI(naturalLanguageInput);
      console.log('AI Response:', aiResponse);

      const success = await executeStructuredCommand(aiResponse.command);

      if (success) {
        setLastCommand({
          input: naturalLanguageInput,
          command: aiResponse.command,
          timestamp: new Date().toISOString()
        });
      }

      return success;

    } catch (err) {
      console.error('Chart Command Error:', err);
      setError(err.message || 'Failed to process command');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [chartTransform, loadedTemplates, loadedLayers]);

  // Execute structured command
  const executeStructuredCommand = useCallback(async (command) => {
    if (!command || !command.action) {
      setError('Invalid command structure');
      return false;
    }

    try {
      const { action } = command;

      // Push to history before mutations
      if (action !== 'reset') {
        chartTransform.pushToHistory();
      }

      switch (action) {
        case 'load_template':
          return await executeLoadTemplate(command.template);

        case 'add_layer':
          return await executeAddLayer(command.layer);

        case 'remove_layer':
          return await executeRemoveLayer(command.layer);

        case 'change':
          return executeChangeCommand(command.target, command.property, command.value);

        case 'reset':
          chartTransform.resetChart();
          setLoadedTemplates([]);
          setLoadedLayers([]);
          return true;

        default:
          setError(`Unknown action: ${action}`);
          return false;
      }

    } catch (err) {
      setError(`Command execution failed: ${err.message}`);
      return false;
    }
  }, [chartTransform, loadedTemplates, loadedLayers]);

  // Load base template
  const executeLoadTemplate = useCallback(async (templateName) => {
    try {
      // Import template dynamically
      const templateModule = await import(`./${templateName}`);
      const template = templateModule.default || templateModule[templateName];

      if (!template || !template.elements) {
        throw new Error(`Invalid template: ${templateName}`);
      }

      // Register all template elements
      template.elements.forEach(element => {
        chartTransform.registerElementData(element.id, element);
      });

      setLoadedTemplates([templateName]);
      setLoadedLayers([]); // Clear layers when loading new template

      console.log(`Loaded template: ${templateName}`, template.elements.length, 'elements');
      return true;

    } catch (err) {
      setError(`Failed to load template ${templateName}: ${err.message}`);
      return false;
    }
  }, [chartTransform]);

  // Add layer on top of existing chart
  const executeAddLayer = useCallback(async (layerName) => {
    if (loadedLayers.includes(layerName)) {
      setError(`Layer ${layerName} already loaded`);
      return false;
    }

    try {
      // Import layer template
      const layerModule = await import(`./${layerName}`);
      const layer = layerModule.default || layerModule[layerName];

      if (!layer || !layer.elements) {
        throw new Error(`Invalid layer: ${layerName}`);
      }

      // Register layer elements
      layer.elements.forEach(element => {
        chartTransform.registerElementData(element.id, element);
      });

      setLoadedLayers(prev => [...prev, layerName]);

      console.log(`Added layer: ${layerName}`, layer.elements.length, 'elements');
      return true;

    } catch (err) {
      setError(`Failed to add layer ${layerName}: ${err.message}`);
      return false;
    }
  }, [chartTransform, loadedLayers]);

  // Remove layer
  const executeRemoveLayer = useCallback(async (layerName) => {
    if (!loadedLayers.includes(layerName)) {
      setError(`Layer ${layerName} not loaded`);
      return false;
    }

    try {
      // Import layer to get element IDs
      const layerModule = await import(`./${layerName}`);
      const layer = layerModule.default || layerModule[layerName];

      // Remove layer elements (would need to implement in chartTransform)
      // For now, just track in state
      setLoadedLayers(prev => prev.filter(l => l !== layerName));

      console.log(`Removed layer: ${layerName}`);
      return true;

    } catch (err) {
      setError(`Failed to remove layer ${layerName}: ${err.message}`);
      return false;
    }
  }, [loadedLayers]);

  // Execute primitive-level changes
  const executeChangeCommand = useCallback((target, property, value) => {
    const targets = Array.isArray(target) ? target : [target];

    for (const targetId of targets) {
      const elementData = chartTransform.getElementData(targetId);
      if (!elementData) {
        setError(`Element '${targetId}' not found`);
        return false;
      }
    }

    for (const targetId of targets) {
      chartTransform.updateElementData(targetId, {
        [property]: value
      });
    }

    console.log(`Changed ${property} to ${value} for:`, targets);
    return true;
  }, [chartTransform]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    executeCommand,
    executeStructuredCommand,
    isProcessing,
    lastCommand,
    error,
    clearError,
    loadedTemplates,
    loadedLayers
  };
};