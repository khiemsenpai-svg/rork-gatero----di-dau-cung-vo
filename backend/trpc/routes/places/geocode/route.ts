import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { geocodeAddress } from "@/utils/googlePlacesUtils";

export const geocodeProcedure = publicProcedure
  .input(
    z.object({
      address: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log("🔍 Geocoding address:", input.address);
    
    const result = await geocodeAddress(input.address);
    
    if (!result) {
      throw new Error(`Could not geocode address: ${input.address}`);
    }
    
    console.log(`✅ Geocoded "${input.address}" to:`, result);
    
    return {
      address: input.address,
      location: result,
    };
  });

export default geocodeProcedure;