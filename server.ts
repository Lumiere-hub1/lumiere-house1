import express from "express";
import app from "./server/app";

// Keep the direct Express import in this root entrypoint for Vercel's detector.
void express;

export default app;
