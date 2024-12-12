import type HttpClient from "./client";

export type Response = Awaited<ReturnType<HttpClient["request"]>>;
