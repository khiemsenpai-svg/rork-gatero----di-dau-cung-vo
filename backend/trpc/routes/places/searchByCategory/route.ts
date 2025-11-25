import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { searchGooglePlacesByCategory } from "@/utils/googlePlacesUtils";

export const searchByCategoryProcedure = publicProcedure
  .input(
    z.object({
      category: z.string(),
      lat: z.number(),
      lng: z.number(),
      radius: z.number().optional().default(5000),
    })
  )
  .query(async ({ input }) => {
    console.log("🔍 Searching places by category:", input);
    
    const results = await searchGooglePlacesByCategory(
      input.category,
      input.lat,
      input.lng,
      input.radius
    );
    
    console.log(`✅ Found ${results.length} places for category "${input.category}"`);
    
    return {
      places: results,
      searchedCategory: input.category,
      location: {
        lat: input.lat,
        lng: input.lng,
      },
      radius: input.radius,
    };
  });

export default searchByCategoryProcedure;