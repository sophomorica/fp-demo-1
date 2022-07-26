declare var Footprint: {
  start: (monitorID: string, configUrls: string[], requestDelay: number, tag?: string, customerId?: string, endpointSubstitutionMap?: {
      [key: string]: string;
  }, callback?: (results: {
      RequestID: string;
      Object: string;
      Conn: "warm" | "cold";
      Result: number;
      T: number;
      Rip?: string;
      Ep?: string;
      Fe?: string;
      Mn?: string;
  }[]) => void, fpconfig?: {
      n: number;
      e: {
          /**
           * Domain of the endpoint to measure
           */
          e: string;
          /**
           * Weight of the endpoint
           */
          w: number;
          /**
           * Types of measurement to take against the endpoint
           */
          m: number;
      }[];
      r: string[];
  }, cache?: (config: {
      n: number;
      e: {
          /**
           * Domain of the endpoint to measure
           */
          e: string;
          /**
           * Weight of the endpoint
           */
          w: number;
          /**
           * Types of measurement to take against the endpoint
           */
          m: number;
      }[];
      r: string[];
  }) => void) => void;
};
export default Footprint ;
