import React from 'react';

function ResultDisplay({ results }) {
    return (
        <div className="result-display">
            <h2>Analysis Results</h2>
            <pre>{JSON.stringify(results, null, 2)}</pre>
            </div>
    );
}

export default ResultDisplay;