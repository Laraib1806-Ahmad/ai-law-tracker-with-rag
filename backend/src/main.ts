import "dotenv/config";
import express from "express";
import ragRoutes from "./module/rag/rag.route";

const app = express();
app.use(express.json());

app.use("/rag", ragRoutes);
app.listen(3000, () => console.log("Server running on port 3000"));
