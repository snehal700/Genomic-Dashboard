import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export async function getGeneVisualizations(gene) {
    const response = await axios.get(
        `${API_BASE_URL}/api/gene/${encodeURIComponent(gene)}/visualizations`
    );

    return response.data;
}