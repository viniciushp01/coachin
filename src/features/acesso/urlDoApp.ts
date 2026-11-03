/**
 * Endereço completo de uma rota do app, para onde os links dos e-mails do Supabase voltam.
 * Usa a origem atual: funciona em localhost, nos previews da Vercel e em produção, desde que
 * a origem esteja nas "Redirect URLs" do painel (#14).
 */
export function urlDoApp(caminho: `/${string}`) {
  return `${window.location.origin}${caminho}`;
}
