# TruthLens
TruthLens is a chrome extension desgined to counter deep-fake/ AI-generated content by analyzing text and images in real time.

## Features
- Analyzes text and images in real time
- Detects AI-generated content using Amazon Rekognition API and Google Cloud Natural Language API
- Allows users to select the type of content to analyze (videos, images, text)
- Displays the likelihood of AI-generated content

## Technologies Used
- React
- HTML
- CSS
- JavaScript
- Amazon Rekognition API
- Google Cloud Natural Language API

## Setup and Installation
1. Clone the repository
   ```bash
   git clone https://github.com/RiyaWat/TruthLens.git
2. Install dependencies
   ```bash
   npm install
3. Set up environment
- Install and configure AWS CLI and Google Cloud SDK
- Install required libraries
  ```bash
  npm install aws-sdk
  npm install @google-cloud/language
4. Obtain API keys from Amazon Rekognition API and Google Cloud Natural Language API
5. Update files with API keys
6. Load chrome extension
   1. Go to chrome://extensions
   2. Enable developer mode
   3. "Load Unpacked"
   4. Select folder where extension is located


## Usage
1. Click the TruthLens icon in the Chrome toolbar
2. Select the type of content to analyze
3. The exrension will analyze the content and display the results

## Contributions
Contributions are always welcome and I am always looking for ways to improve so just submit a pull request if anything.

## Contact
Feel free to contact me via my [Email](mailto:riyawatkins718@gmail.com) or on my [GitHub](https://github.com/RiyaWat).
