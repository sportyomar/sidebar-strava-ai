import React from 'react';
import metricGlossary from "../constants/metricGlossary";

// glossary registry

function GlossaryPanel({module}){


    // Define which glossary keys are relevant for each module
    const executiveUseCasesToGlossary = {
        performanceOverview: ['value', 'comparison', 'trend', 'annotations'],
        forecastPlanning: ['forecast', 'timeframe', 'confidence', 'seasonality'],
        dataTrust: ['freshness', 'confidence', 'reconciliation'],
        teamAction: ['insight', 'action', 'ownership']
    };


    return(
        <div>

        </div>
    )
}

export default GlossaryPanel;