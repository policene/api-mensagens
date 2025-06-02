const axios = require('axios');
const jwt = require('jsonwebtoken');
const { getCache, setCache } = require('../config/redis');


const AUTH_API_URL = 'http://auth-api:8000/token';

async function verifyToken(userId, authorizationHeader) {
    if (!authorizationHeader) {
        return { isAuthenticated: false, error: "Authorization header is missing.", status: 400 };
    }

    const cacheKey = `auth:${userId}:${authorizationHeader}`

    const cached = await getCache(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        const response = await axios.get(
            AUTH_API_URL,
            {
                params: { id: userId },
                headers: { Authorization: authorizationHeader }
            }
        );

        const result = { isAuthenticated: response.data.auth, data: response.data, status: 200 };
        await setCache(cacheKey, result, 300);
        return result;
    } catch (error) {
        console.error('Error on verifying token with Auth API', error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 401) {
            return { isAuthenticated: false, error: "Not authorized by Auth API.", status: 401 };
        }
        return { isAuthenticated: false, error: 'Error while trying to connect to Auth API.', status: 500 };
    }
}

module.exports = { verifyToken };