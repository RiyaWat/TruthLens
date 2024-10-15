import React, {useState} from 'react';
import axios from 'axios';
import ResultDisplay from './ResultDisplay';

const Analyzer = () => {
    const [file, setFile] = useState(null);
    const [contentType, setContentType] = useState('text');
    const [analysisResults, setAnalysisResults] = useState({});

const handleFileChange = (e) => {
    setFile(e.target.files[0]);
};

const analyzeContent = async () => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', contentType);

    try{
        const response = await axios.post('/api.analyze', formData);
        setAnalysisResults(response.data);
    } catch(error){
        console.error(error);
    }
};

return(
    <div>
        <input type="file" onChange={handleFileChange} />
        <select onChange={(e) => setContentType(e.target.value)}>
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
        </select>
        <button onClick={analyzeContent}>Analyze</button>
        {analysisResults && <ResultDisplay results={analysisResults} />}
    </div>
    );
};

export default Analyzer;