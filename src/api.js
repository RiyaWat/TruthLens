import analyzeText from './textAnalyzer';
import analyzeImage from './imageAnalyzer';
import analyzeVideo from './videoAnalyzer';

const express = require('express');
const router = express.Router();

router.post('/analyze', async (req, res) => {
    const file = req.file;
    const contentType = req.body.type;

    let analysisResults;

    if (contentType === 'image'){
        analysisResults = await analyzeImage(file);
    } else if (contentType === 'text'){
        analysisResults = await analyzeText(file);
    } else if (contentType === 'video'){
        analysisResults = await analyzeVideo(file);
    }

    res.json(analysisResults);
});

module.exports = router;