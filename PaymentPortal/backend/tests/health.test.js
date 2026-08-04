import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

test("GET /health -> 200 { ok: true }", async () => {
  const res = await request(app).get("/health");
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ ok: true });
});
