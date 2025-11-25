import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { getPlaceDetails } from "@/utils/googlePlacesUtils";

export const getDetailsProcedure = publicProcedure
  .input(
    z.object({
      placeId: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log("🔍 Getting place details:", input.placeId);
    
    const result = await getPlaceDetails(input.placeId);
    
    if (!result) {
      throw new Error(`Could not get details for place: ${input.placeId}`);
    }
    
    console.log(`✅ Got details for place:`, result.name);
    
    return result;
  });

export default getDetailsProcedure;