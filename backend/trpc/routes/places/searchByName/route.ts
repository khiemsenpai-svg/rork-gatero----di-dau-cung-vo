import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { searchGooglePlacesByName } from "@/utils/googlePlacesUtils";

export const searchByNameProcedure = publicProcedure
  .input(
    z.object({
      query: z.string(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      radius: z.number().optional().default(50000),
    })
  )
  .query(async ({ input }) => {
    console.log("🔍 Searching places by name:", input);
    
    const results = await searchGooglePlacesByName(
      input.query,
      input.lat,
      input.lng,
      input.radius
    );
    
    console.log(`✅ Found ${results.length} places for query "${input.query}"`);
    
    return {
      places: results,
      searchQuery: input.query,
      location: input.lat && input.lng ? {
        lat: input.lat,
        lng: input.lng,
      } : undefined,
      radius: input.radius,
    };
  });

export default searchByNameProcedure;