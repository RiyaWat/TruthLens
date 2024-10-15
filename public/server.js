const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const {google} = require('googleapis');

const app = express();
const upload = multer();

// Set up AWS
AWS.config.update({ region: 'us-east-2' });
const rekognition = new AWS.Rekognition();

// Set up Google Cloud Vision API
const language = google.language("v1beta2");
const languageApiKey = "API KEY";
const languageApiEndpoint = "https://language.googleapis.com/v1beta2/documents:analyze?key=" + languageApiKey;


app.post('api/analyze', upload.single('file'), async (req, res) => {
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

app.listen(5000, () => {
    console.log('Server running on port 5000');
});

const analyzeImage = async (file) => {
    const params = {
        Image: {
            Bytes: file.buffer
        },
        Attributes: ['ALL']
    };

    try {
        const response = await rekognition.detectFaces(params).promise();
        return response.FaceDetails;
    } catch (error) {
        console.error('Error analyzing image:', error);
        return {};
    }
};

const analyzeText = async (file) => {
    const text = file.buffer.toString('utf-8');
    const request = {
        document: {
            type: 'plain_text',
            content: text
        },
        encodingType: 'utf-8'
    };

    try {
        const response = await language.documents.analyze(request);
        return response.data;
    } catch (error) {
        console.error('Error analyzing text:', error);
        return {};
    }
};

const analyzeVideo = async (file) => {
    const videoBuffer = file.buffer;
    const videoParams = {
        Video:{
            Bytes: videoBuffer
        }
    };

    try {
        const response = await rekognition.startLabelDetection(videoParams).promise();
        const jobId = response.JobId;

        const getJobStatus = async () => {
            const statusParams = {
                JobId: jobId
            };

            try {
                const statusResponse = await rekognition.getLabelDetection(statusParams).promise();
                return statusResponse.JobStatus;
            } catch (error) {
                console.error('Error getting job status:', error);
                return 'FAILED';
            }
    };

    let jobStatus = await getJobStatus();

    while (jobStatus === 'IN_PROGRESS') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        jobStatus = await getJobStatus();
    }

    if (jobStatus === 'SUCCEEDED') {
        const labelsParams = {
            JobId: jobId
        };

        try {
            const labelsResponse = await rekognition.getLabelDetection(labelsParams).promise();
            return labelsResponse.Labels;
        } catch (error) {
            console.error('Error getting labels:', error);
            return [];
        }
    } else {
        return [];
    }
} catch (error) {
    console.error(error);
    return [];
    }
};