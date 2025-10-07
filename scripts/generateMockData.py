import json
import random
import re
from datetime import datetime, timedelta
import argparse
import sys
import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def extract_transaction_types_from_js(js_file_path):
    """
    Extract transaction types from a JavaScript file into a Python dictionary using a more robust approach
    """
    try:
        with open(js_file_path, 'r') as file:
            js_content = file.read()

        # Extract the transactionTypes object declaration
        match = re.search(r'const\s+transactionTypes\s*=\s*({[\s\S]*?});', js_content)
        if not match:
            print("Could not find transactionTypes object declaration in the JavaScript file.")
            sys.exit(1)

        js_object_text = match.group(1)

        # Parse the individual transaction type objects
        transaction_types = {}

        # Pattern to match each transaction type entry
        pattern = r'(\w+):\s*{([^{}]*(?:{[^{}]*}[^{}]*)*?)}'

        for match in re.finditer(pattern, js_object_text):
            key = match.group(1)
            properties_text = match.group(2)

            # Extract properties
            props = {}

            # Label
            label_match = re.search(r'label:\s*"([^"]*)"', properties_text)
            if label_match:
                props['label'] = label_match.group(1)

            # Description
            desc_match = re.search(r'description:\s*"([^"]*)"', properties_text)
            if desc_match:
                props['description'] = desc_match.group(1)

            # Category
            cat_match = re.search(r'category:\s*"([^"]*)"', properties_text)
            if cat_match:
                props['category'] = cat_match.group(1)

            # Actors
            actors_match = re.search(r'actors:\s*\[(.*?)\]', properties_text)
            if actors_match:
                actors_text = actors_match.group(1)
                # Extract quoted strings from actors array
                actors = re.findall(r'"([^"]*)"', actors_text)
                props['actors'] = actors

            transaction_types[key] = props

        return transaction_types

    except Exception as e:
        print(f"Error extracting transaction types: {e}")
        sys.exit(1)


def get_mock_data_from_anthropic(transaction_type, type_info):
    """
    Use Anthropic's Claude API to generate mock data for a transaction type
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not found")
        sys.exit(1)

    headers = {
        "x-api-key": api_key,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01"
    }

    # Define the prompt for mock data generation
    category = type_info["category"]
    label = type_info["label"]
    description = type_info["description"]
    actors = type_info["actors"][0] if type_info["actors"] else "Unknown"

    prompt = f"""You're generating realistic mock financial data for a {label} transaction ({description}).
This is a {category} type transaction involving {actors}.

Create a JavaScript object containing realistic mock data fields relevant to this transaction type.
Include between 6-10 fields that would be appropriate for this specific transaction type.
Use realistic values for financial figures, dates (recent dates from 2023-2025), company names, etc.

For financial values, use whole numbers without commas or dollar signs (e.g., 4200000000 for $4.2B).
Add JS-style comments showing the human-readable value for large numbers (e.g., 4200000000 // $4.2B).

Format the output exactly like this example:
```javascript
// /data/mockMetricsByUseCase.js
const mockMetricsByUseCase = {{
  // ... existing entries
  goingPrivate: {{
    companyName: "NovaTech Systems",
    acquirerName: "Silver Lake Partners",
    acquisitionPrice: 4200000000, // $4.2B
    enterpriseValue: 5000000000, // $5B
    premiumToMarket: 22.5, // % premium over stock price
    delisted: true,
    date: "2024-08-15",
    stockTicker: "NOVA", 
    publicToPrivateReason: "Strategic restructuring and long-term growth focus"
  }}
}};

export default mockMetricsByUseCase;
```

I need mock data for a {transaction_type} transaction. Please don't include any explanations, only output the mock data object.
"""

    # Prepare the API request
    data = {
        "model": "claude-3-opus-20240229",
        "max_tokens": 1000,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    try:
        # Make the API request
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=data
        )

        # Check for errors
        response.raise_for_status()

        # Extract the generated text
        result = response.json()
        generated_text = result['content'][0]['text']

        # Extract just the JavaScript code
        js_code_match = re.search(r'```javascript\s*([\s\S]*?)\s*```', generated_text)
        if js_code_match:
            return js_code_match.group(1).strip()
        else:
            return generated_text.strip()

    except Exception as e:
        print(f"Error calling Anthropic API: {e}")
        if 'response' in locals() and hasattr(response, 'text'):
            print(f"API response: {response.text}")
        sys.exit(1)


def get_mock_data_from_openai(transaction_type, type_info):
    """
    Use Azure OpenAI API to generate mock data for a transaction type
    """
    api_key = os.environ.get("AZURE_OPENAI_API_KEY")
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    api_version = os.environ.get("AZURE_OPENAI_API_VERSION")
    model = os.environ.get("AZURE_OPENAI_MODEL")

    if not (api_key and endpoint and api_version and model):
        print("Error: One or more Azure OpenAI environment variables not found")
        sys.exit(1)

    headers = {
        "api-key": api_key,
        "Content-Type": "application/json"
    }

    # Define the prompt for mock data generation
    category = type_info["category"]
    label = type_info["label"]
    description = type_info["description"]
    actors = type_info["actors"][0] if type_info["actors"] else "Unknown"

    prompt = f"""You're generating realistic mock financial data for a {label} transaction ({description}).
This is a {category} type transaction involving {actors}.

Create a JavaScript object containing realistic mock data fields relevant to this transaction type.
Include between 6-10 fields that would be appropriate for this specific transaction type.
Use realistic values for financial figures, dates (recent dates from 2023-2025), company names, etc.

For financial values, use whole numbers without commas or dollar signs (e.g., 4200000000 for $4.2B).
Add JS-style comments showing the human-readable value for large numbers (e.g., 4200000000 // $4.2B).

Format the output exactly like this example:
```javascript
// /data/mockMetricsByUseCase.js
const mockMetricsByUseCase = {{
  // ... existing entries
  goingPrivate: {{
    companyName: "NovaTech Systems",
    acquirerName: "Silver Lake Partners",
    acquisitionPrice: 4200000000, // $4.2B
    enterpriseValue: 5000000000, // $5B
    premiumToMarket: 22.5, // % premium over stock price
    delisted: true,
    date: "2024-08-15",
    stockTicker: "NOVA", 
    publicToPrivateReason: "Strategic restructuring and long-term growth focus"
  }}
}};

export default mockMetricsByUseCase;
```

I need mock data for a {transaction_type} transaction. Please don't include any explanations, only output the mock data object.
"""

    # Prepare the API request
    data = {
        "messages": [
            {"role": "system", "content": "You are a helpful assistant specializing in financial data."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 800,
        "temperature": 0.7
    }

    try:
        # Make the API request
        api_url = f"{endpoint}/openai/deployments/{model}/chat/completions?api-version={api_version}"
        response = requests.post(api_url, headers=headers, json=data)

        # Check for errors
        response.raise_for_status()

        # Extract the generated text
        result = response.json()
        generated_text = result['choices'][0]['message']['content']

        # Extract just the JavaScript code
        js_code_match = re.search(r'```javascript\s*([\s\S]*?)\s*```', generated_text)
        if js_code_match:
            return js_code_match.group(1).strip()
        else:
            return generated_text.strip()

    except Exception as e:
        print(f"Error calling Azure OpenAI API: {e}")
        if 'response' in locals() and hasattr(response, 'text'):
            print(f"API response: {response.text}")
        sys.exit(1)


def generate_mock_data_for_transaction_type(transaction_type, transaction_types, llm_provider="anthropic"):
    """
    Generate mock data for a specific transaction type using an LLM
    """
    if transaction_type not in transaction_types:
        print(f"Available transaction types: {', '.join(transaction_types.keys())}")
        return {"error": f"Transaction type '{transaction_type}' not found"}

    type_info = transaction_types[transaction_type]

    # Select the LLM provider
    if llm_provider.lower() == "anthropic":
        return get_mock_data_from_anthropic(transaction_type, type_info)
    elif llm_provider.lower() == "azure" or llm_provider.lower() == "openai":
        return get_mock_data_from_openai(transaction_type, type_info)
    else:
        print(f"Error: Unknown LLM provider '{llm_provider}'")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Generate mock data for a transaction type using an LLM')
    parser.add_argument('transaction_type', help='The transaction type to generate mock data for')
    parser.add_argument('--js_file', default='transactionTypes.js',
                        help='Path to the JavaScript file with transaction types')
    parser.add_argument('--llm', default='anthropic', choices=['anthropic', 'azure', 'openai'],
                        help='Which LLM provider to use')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode to see JS parsing details')

    args = parser.parse_args()

    # Extract transaction types from JS file
    transaction_types = extract_transaction_types_from_js(args.js_file)

    if args.debug:
        print("Extracted transaction types:")
        for key, value in transaction_types.items():
            print(f"  {key}: {value}")
        print("\n")

    # Generate mock data using the specified LLM
    mock_data = generate_mock_data_for_transaction_type(args.transaction_type, transaction_types, args.llm)

    # Print the result
    print(mock_data)


if __name__ == "__main__":
    main()

# python generateMockData.py goingPrivate --js_file=../src/constants/transactionTypes.js --llm=azure
# # For a buyout transaction
# python generateMockData.py buyout --js_file=../src/constants/transactionTypes.js --llm=azure
#
# # For an IPO exit
# python generateMockData.py ipo --js_file=../src/constants/transactionTypes.js --llm=azure
#
# # For a secondary buyout
# python generateMockData.py secondaryBuyout --js_file=../src/constants/transactionTypes.js --llm=azure
# Investment Deal Types:
#
# acquisitionFinancing
# addOnAcquisition
# buyout
# consolidation
# divestitureInvestment
# goingPrivate
# growthCapital
# jointVenture
# mergerInvestment
# recapitalizationInvestment
# secondaryBuyout
# specialSituations
# stakePurchase
# venture
#
# Exit Deal Types:
#
# bankruptcy
# divestitureExit
# ipo
# mergerExit
# recapitalizationExit
# secondarySale
# shutDown
# soldToExistingInvestors
# soldToManagement
# spac
# spinOff
# stakeSale
# tradeSale
#
# Try running the command with one of these transaction types as the first argument, and the script should work properly.