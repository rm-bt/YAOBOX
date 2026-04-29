import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { registerRequest } from "../../../api/auth.api";
import type { RegisterFormValues } from "../../../api/types/auth.types";

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: RegisterFormValues) => registerRequest(values),
    onSuccess: () => {
      navigate("/login", { replace: true });
    }
  });
}