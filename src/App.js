import React, { useState } from 'react';
import ".src/index.css";
import ResultDisplay from './ResultDisplay';

function App() {
    const [file, setFile] = useState(null);
    const [contentType, setContentType] = useState('');
    const [analysisResults, setAnalysisResults] = useState({});

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleContentTypeChange = (event) => {
        setContentType(event.target.value);
    };

    const handleAnalyze = async () => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', contentType);

     try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            const results = await response.json();
            setAnalysisResults(results);
        } catch (error){
            console.error(error);
        }
    };

    return(
        <div id="root">
            <h1>TruthLens</h1>
            <div className="analyzer">
                <input type="file" onChange={handleFileChange}></input>
                <select onChange ={handleContentTypeChange}>
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                </select>
                <button onClick={handleAnalyze}>Analyze</button>
            </div>
            <ResultDisplay results={analysisResults} />

        </div>
    );
}

export default App;