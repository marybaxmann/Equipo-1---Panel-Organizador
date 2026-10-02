import React from "react";
import Boton from "../components/ui/Boton.jsx";

export default function LoginSimuladoPage() {
  function entrarComo(token) {
    document.cookie = `jwt=${token}; path=/; SameSite=Lax`;
    window.location.assign("/mis-eventos");
  }

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", fontFamily: "var(--font-body)" }}>
      <h1 style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display)" }}>Iniciar sesión (simulado)</h1>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: "24px" }}>
        Sólo para desarrollo y demo. El login real lo provee el módulo Auth.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Boton variante="primario" onClick={() => entrarComo("token-org-a")}>Organizadora A</Boton>
        <Boton variante="primario" onClick={() => entrarComo("token-org-b")}>Organizador B</Boton>
        <Boton variante="secundario" onClick={() => entrarComo("token-asistente")}>Asistente (sin rol organizador)</Boton>
        <Boton variante="secundario" onClick={() => entrarComo("token-expirado")}>Sesión expirada</Boton>
        <Boton variante="peligro" onClick={() => entrarComo("token-lento")}>Auth no disponible (503)</Boton>
      </div>
    </div>
  );
}
