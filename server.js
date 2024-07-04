const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

const corsOptions = {
  origin: 'https://image-search-abstraction-layer-frontend-1zgbk4y4x.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/build')));

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

const imageSchema = new mongoose.Schema({
    type: String,
    width: Number,
    height: Number,
    size: Number,
    url: String,
    thumbnail: {
        url: String,
        width: Number,
        height: Number
    },
    description: String,
    parentPage: String
});

const Image = mongoose.model('Image', imageSchema);

const recentSearchesSchema = new mongoose.Schema({
    term: String,
    timestamp: { type: Date, default: Date.now }
});

const RecentSearch = mongoose.model('RecentSearch', recentSearchesSchema);

app.get('/api/imagesearch', async (req, res) => {
    const searchTerm = req.query.term;
    const page = req.query.page || 1;
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&page=${page}&client_id=${UNSPLASH_ACCESS_KEY}`;

    try {
        console.log('Fetching images from Unsplash API...');
        const response = await axios.get(url);
        console.log('Response received from Unsplash API');
        const data = response.data;
        const imageData = data.results.map(item => ({
            id: item.id,
            url: item.urls.full,
            description: item.alt_description,
            pageUrl: item.links.html,
            thumbnail: {
                url: item.urls.thumb,
                width: item.width,
                height: item.height
            }
        }));

        await RecentSearch.create({ term: searchTerm });

        res.json({
            images: imageData,
            totalPages: data.total_pages
        });
    } catch (error) {
        console.error('Error fetching images:', error.message);
        res.status(500).json({ error: 'Error fetching images' });
    }
});

app.get('/api/recent', async (req, res) => {
  try {
    console.log('Fetching recent searches from MongoDB...');

    const recentSearches = await RecentSearch.find().sort({ timestamp: -1 }).limit(10);
    console.log('Recent searches fetched from MongoDB');

    res.json({ recentSearches });
  } catch (error) {
    console.error('Error fetching recent searches:', error.message);
    res.status(500).json({ error: 'Error fetching recent searches' });
  }
});

app.post('/api/recent', async (req, res) => {
  try {
    const { term } = req.body;
    const newSearch = new RecentSearch({ term });
    await newSearch.save();
    res.status(201).json({ message: 'Search term saved' });
  } catch (error) {
    console.error('Error saving search term:', error.message);
    res.status(500).json({ message: 'Error saving search term' });
  }
});

app.get('/api/test', (req, res) => {
    console.log('Sending test response...');
    res.json({ message: 'This is a test response' });
});

app.get('/', (req, res) => {
    res.send('The server is working fine');
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
