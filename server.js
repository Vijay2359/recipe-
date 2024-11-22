require('dotenv').config(); // Load environment variables from .env file
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path'); // Import path module to serve static files
const cors = require('cors'); // Import CORS module for cross-origin requests

// Correctly join the path to the password file
const dbPasswordPath = path.join(__dirname, 'db_password.txt');

// Read the password from the file
let dbPassword;
try {
    dbPassword = fs.readFileSync(dbPasswordPath, 'utf8').trim();
} catch (err) {
    console.error('Error reading database password file:', err.message);
    process.exit(1); // Exit the process if the file cannot be read
}

const app = express();
const port = process.env.PORT || 3000; // Use the port from .env or default to 3000

// PostgreSQL configuration using the password from the file
const pool = new Pool({
    user: process.env.DB_USER || 'postgres', // Use the DB user from .env or default to 'postgres'
    host: process.env.DB_HOST || 'localhost', // Default to localhost
    database: process.env.DB_NAME || 'your_database_name', // Replace with your DB name
    password: dbPassword, // Use the password from the file
    port: process.env.DB_PORT || 5432, // Default PostgreSQL port if not specified
});

// Middleware
app.use(cors()); // Enable CORS to allow cross-origin requests
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from "public"

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Endpoints

// Get all recipes
app.get('/recipes', async (req, res) => {
    console.log('GET /recipes called'); // Debugging log to check if the endpoint is called

    try {
        const result = await pool.query('SELECT * FROM recipes');
        console.log('Fetched recipes:', result.rows); // Log the recipes fetched from the database
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching recipes:', err); // Log the error
        res.status(500).json({ error: err.message });
    }
});

// Add a new recipe
app.post('/recipes', async (req, res) => {
    const { name, ingredients, instructions } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO recipes (name, ingredients, instructions) VALUES ($1, $2, $3) RETURNING *',
            [name, ingredients, instructions]
        );
        console.log('Inserted recipe:', result.rows[0]); // Log the inserted recipe
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding recipe:', err); // Log the error
        res.status(500).json({ error: err.message });
    }
});

// Delete a recipe by ID
app.delete('/recipes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM recipes WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        console.log('Deleted recipe:', result.rows[0]); // Log the deleted recipe
        res.status(200).json({ message: 'Recipe deleted successfully', recipe: result.rows[0] });
    } catch (err) {
        console.error('Error deleting recipe:', err); // Log the error
        res.status(500).json({ error: err.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
