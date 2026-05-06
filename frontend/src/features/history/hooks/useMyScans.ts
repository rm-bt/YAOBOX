import { useQuery } from "@tanstack/react-query";
import { getMyScans } from "../../../api/scans.api";

export function useMyScans() {
  return useQuery({
    queryKey: ["my-scans"],
    queryFn: getMyScans,
  });
}