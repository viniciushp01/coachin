import { createFileRoute, redirect } from "@tanstack/react-router";

// Link curto do convite (/c/<token>): só leva para /convite/<token>, que continua valendo
// para os e-mails e links já enviados.
export const Route = createFileRoute("/c/$token")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/convite/$token", params: { token: params.token }, replace: true });
  },
});
