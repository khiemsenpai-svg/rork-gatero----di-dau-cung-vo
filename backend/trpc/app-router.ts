import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import searchByCategoryProcedure from "./routes/places/searchByCategory/route";
import searchByNameProcedure from "./routes/places/searchByName/route";
import geocodeProcedure from "./routes/places/geocode/route";
import getDetailsProcedure from "./routes/places/getDetails/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  places: createTRPCRouter({
    searchByCategory: searchByCategoryProcedure,
    searchByName: searchByNameProcedure,
    geocode: geocodeProcedure,
    getDetails: getDetailsProcedure,
  }),
});

export type AppRouter = typeof appRouter;
