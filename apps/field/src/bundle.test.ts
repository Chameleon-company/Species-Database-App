import { describe, expect, it } from "vitest";
import { type Bundle, fetchBundle, firstSpecies } from "./bundle.ts";

const species = (species_id: number) => ({
  species_id,
  scientific_name: `Scientific ${species_id}`,
  common_name: `Common ${species_id}`,
});

const bundle = (ids: number[]): Bundle => ({ version: 1, species_en: ids.map(species) });

const respond = (status: number, body: unknown) => () =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("firstSpecies", () => {
  it("returns the species with the lowest id", () => {
    expect(firstSpecies(bundle([7, 2, 9]))?.species_id).toBe(2);
  });

  it("returns undefined for an empty bundle", () => {
    expect(firstSpecies(bundle([]))).toBeUndefined();
  });
});

describe("fetchBundle", () => {
  it("requests /api/bundle once, without a doubled slash", async () => {
    const urls: string[] = [];
    const fetchFn = (url: string) => {
      urls.push(url);
      return respond(200, bundle([1]))();
    };
    await fetchBundle("http://api.test/", undefined, fetchFn as typeof fetch);
    expect(urls).toEqual(["http://api.test/api/bundle"]);
  });

  it("returns the parsed bundle", async () => {
    const result = await fetchBundle("http://api.test", undefined, respond(200, bundle([4])));
    expect(result.species_en[0]?.species_id).toBe(4);
  });

  it("rejects with the status when the response is not OK", async () => {
    await expect(fetchBundle("http://api.test", undefined, respond(503, {}))).rejects.toThrow(
      "GET /api/bundle failed with 503",
    );
  });
});
