import React from "react";

// Corrigido: Como estão na MESMA pasta, usamos './'
import { FormularioSubmissao } from "./FormularioSubmissao";
import { ConsultaStatus } from "./ConsultaStatus";

// Corrigido: O Carrossel ficou na pasta 'components', então subimos um nível com '../'
import { CarrosselAvisos } from "../components/CarrosselAvisos";

export const PaginaInicialCidadao = () => {
  return (
    <>
      <section>
        <h2 className="text-2xl font-semibold mb-4 border-l-4 border-blue-500 pl-4">
          Enviar Novo Caso
        </h2>
        <FormularioSubmissao />
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4 border-l-4 border-green-500 pl-4">
          Consultar Status do Caso
        </h2>
        <ConsultaStatus />
      </section>
      <CarrosselAvisos />
    </>
  );
};
