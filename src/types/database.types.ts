export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      areas_direito: {
        Row: {
          id: number
          nome: string
        }
        Insert: {
          id?: number
          nome: string
        }
        Update: {
          id?: number
          nome?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          escritorio_id: string
          id: number
          ip_address: string | null
          registro_id: string | null
          tabela: string
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          escritorio_id: string
          id?: number
          ip_address?: string | null
          registro_id?: string | null
          tabela: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          escritorio_id?: string
          id?: number
          ip_address?: string | null
          registro_id?: string | null
          tabela?: string
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_escritorio_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_usuario_tenant_fkey"
            columns: ["usuario_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id", "escritorio_id"]
          },
        ]
      }
      cargos: {
        Row: {
          created_at: string
          escritorio_id: string
          id: string
          is_admin: boolean
          nome: string
          permissoes: Json
        }
        Insert: {
          created_at?: string
          escritorio_id: string
          id?: string
          is_admin?: boolean
          nome: string
          permissoes?: Json
        }
        Update: {
          created_at?: string
          escritorio_id?: string
          id?: string
          is_admin?: boolean
          nome?: string
          permissoes?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cargos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          escritorio_id: string
          estado: string | null
          id: string
          logradouro: string | null
          nome: string
          numero: string | null
          observacoes: string | null
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          escritorio_id: string
          estado?: string | null
          id?: string
          logradouro?: string | null
          nome: string
          numero?: string | null
          observacoes?: string | null
          telefone?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          escritorio_id?: string
          estado?: string | null
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      cnj_sync_errors: {
        Row: {
          created_at: string
          http_status: number | null
          id: string
          mensagem: string | null
          numero_cnj: string | null
          tribunal: string | null
        }
        Insert: {
          created_at?: string
          http_status?: number | null
          id?: string
          mensagem?: string | null
          numero_cnj?: string | null
          tribunal?: string | null
        }
        Update: {
          created_at?: string
          http_status?: number | null
          id?: string
          mensagem?: string | null
          numero_cnj?: string | null
          tribunal?: string | null
        }
        Relationships: []
      }
      comunicacoes_log: {
        Row: {
          canal: string
          cliente_id: string | null
          destinatario: string
          enviado_em: string
          enviado_por: string | null
          escritorio_id: string
          id: string
          mensagem: string
          processo_id: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          canal?: string
          cliente_id?: string | null
          destinatario: string
          enviado_em?: string
          enviado_por?: string | null
          escritorio_id: string
          id?: string
          mensagem: string
          processo_id?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          canal?: string
          cliente_id?: string | null
          destinatario?: string
          enviado_em?: string
          enviado_por?: string | null
          escritorio_id?: string
          id?: string
          mensagem?: string
          processo_id?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comunicacoes_log_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicacoes_log_cliente_tenant_fkey"
            columns: ["cliente_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id", "escritorio_id"]
          },
          {
            foreignKeyName: "comunicacoes_log_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicacoes_log_enviado_por_tenant_fkey"
            columns: ["enviado_por", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id", "escritorio_id"]
          },
          {
            foreignKeyName: "comunicacoes_log_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicacoes_log_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicacoes_log_processo_tenant_fkey"
            columns: ["processo_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id", "escritorio_id"]
          },
          {
            foreignKeyName: "comunicacoes_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicacoes_log_template_tenant_fkey"
            columns: ["template_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id", "escritorio_id"]
          },
        ]
      }
      djen_oab_monitoramentos: {
        Row: {
          ativo: boolean
          created_at: string
          escritorio_id: string
          id: string
          numero_oab: string
          numero_oab_chave: string | null
          uf_oab: string
          ultima_sincronizacao_em: string | null
          ultima_tentativa_em: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          escritorio_id: string
          id?: string
          numero_oab: string
          numero_oab_chave?: string | null
          uf_oab: string
          ultima_sincronizacao_em?: string | null
          ultima_tentativa_em?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          escritorio_id?: string
          id?: string
          numero_oab?: string
          numero_oab_chave?: string | null
          uf_oab?: string
          ultima_sincronizacao_em?: string | null
          ultima_tentativa_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "djen_oab_monitoramentos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      djen_publicacoes: {
        Row: {
          codigo_classe: string | null
          comunicacao_ativa: boolean | null
          created_at: string
          data_disponibilizacao: string | null
          destinatario_advogados: Json
          destinatarios: Json
          escritorio_id: string
          hash: string
          id: string
          link: string | null
          meio: string | null
          meio_completo: string | null
          nome_classe: string | null
          numero_comunicacao: number | null
          numero_processo: string | null
          numero_processo_com_mascara: string | null
          orgao: string | null
          processo_id: string | null
          texto: string | null
          tipo_comunicacao: string | null
          tipo_documento: string | null
          tribunal: string | null
          updated_at: string
        }
        Insert: {
          codigo_classe?: string | null
          comunicacao_ativa?: boolean | null
          created_at?: string
          data_disponibilizacao?: string | null
          destinatario_advogados?: Json
          destinatarios?: Json
          escritorio_id: string
          hash: string
          id?: string
          link?: string | null
          meio?: string | null
          meio_completo?: string | null
          nome_classe?: string | null
          numero_comunicacao?: number | null
          numero_processo?: string | null
          numero_processo_com_mascara?: string | null
          orgao?: string | null
          processo_id?: string | null
          texto?: string | null
          tipo_comunicacao?: string | null
          tipo_documento?: string | null
          tribunal?: string | null
          updated_at?: string
        }
        Update: {
          codigo_classe?: string | null
          comunicacao_ativa?: boolean | null
          created_at?: string
          data_disponibilizacao?: string | null
          destinatario_advogados?: Json
          destinatarios?: Json
          escritorio_id?: string
          hash?: string
          id?: string
          link?: string | null
          meio?: string | null
          meio_completo?: string | null
          nome_classe?: string | null
          numero_comunicacao?: number | null
          numero_processo?: string | null
          numero_processo_com_mascara?: string | null
          orgao?: string | null
          processo_id?: string | null
          texto?: string | null
          tipo_comunicacao?: string | null
          tipo_documento?: string | null
          tribunal?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "djen_publicacoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "djen_publicacoes_processo_tenant_fkey"
            columns: ["processo_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id", "escritorio_id"]
          },
        ]
      }
      djen_publicacoes_monitoramentos: {
        Row: {
          encontrada_em: string
          escritorio_id: string
          monitoramento_id: string
          publicacao_id: string
        }
        Insert: {
          encontrada_em?: string
          escritorio_id: string
          monitoramento_id: string
          publicacao_id: string
        }
        Update: {
          encontrada_em?: string
          escritorio_id?: string
          monitoramento_id?: string
          publicacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "djen_publicacoes_monitoramentos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "djen_publicacoes_monitoramentos_monitoramento_tenant_fkey"
            columns: ["monitoramento_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "djen_oab_monitoramentos"
            referencedColumns: ["id", "escritorio_id"]
          },
          {
            foreignKeyName: "djen_publicacoes_monitoramentos_publicacao_tenant_fkey"
            columns: ["publicacao_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "djen_publicacoes"
            referencedColumns: ["id", "escritorio_id"]
          },
        ]
      }
      escritorios: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          id: string
          nome: string
          plano: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          plano?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          plano?: string
          updated_at?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          cliente_id: string | null
          cor: string | null
          created_at: string
          criado_por: string
          descricao: string | null
          dia_inteiro: boolean
          escritorio_id: string
          fim: string | null
          id: string
          inicio: string
          link_videoconf: string | null
          local: string | null
          processo_id: string | null
          responsavel_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          cliente_id?: string | null
          cor?: string | null
          created_at?: string
          criado_por: string
          descricao?: string | null
          dia_inteiro?: boolean
          escritorio_id: string
          fim?: string | null
          id?: string
          inicio: string
          link_videoconf?: string | null
          local?: string | null
          processo_id?: string | null
          responsavel_id?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          cliente_id?: string | null
          cor?: string | null
          created_at?: string
          criado_por?: string
          descricao?: string | null
          dia_inteiro?: boolean
          escritorio_id?: string
          fim?: string | null
          id?: string
          inicio?: string
          link_videoconf?: string | null
          local?: string | null
          processo_id?: string | null
          responsavel_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_cliente_tenant_fkey"
            columns: ["cliente_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id", "escritorio_id"]
          },
          {
            foreignKeyName: "eventos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_criado_por_tenant_fkey"
            columns: ["criado_por", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id", "escritorio_id"]
          },
          {
            foreignKeyName: "eventos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_processo_tenant_fkey"
            columns: ["processo_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id", "escritorio_id"]
          },
          {
            foreignKeyName: "eventos_responsavel_tenant_fkey"
            columns: ["responsavel_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id", "escritorio_id"]
          },
        ]
      }
      honorarios: {
        Row: {
          base_calculo_exito: string | null
          cliente_id: string
          contingenciamento: string | null
          created_at: string
          descricao: string | null
          escritorio_id: string
          id: string
          percentual_exito: number | null
          processo_id: string | null
          status: string
          tipo: string
          updated_at: string
          valor_fixo: number | null
        }
        Insert: {
          base_calculo_exito?: string | null
          cliente_id: string
          contingenciamento?: string | null
          created_at?: string
          descricao?: string | null
          escritorio_id: string
          id?: string
          percentual_exito?: number | null
          processo_id?: string | null
          status?: string
          tipo: string
          updated_at?: string
          valor_fixo?: number | null
        }
        Update: {
          base_calculo_exito?: string | null
          cliente_id?: string
          contingenciamento?: string | null
          created_at?: string
          descricao?: string | null
          escritorio_id?: string
          id?: string
          percentual_exito?: number | null
          processo_id?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_fixo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "honorarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honorarios_cliente_tenant_fkey"
            columns: ["cliente_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id", "escritorio_id"]
          },
          {
            foreignKeyName: "honorarios_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honorarios_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honorarios_processo_tenant_fkey"
            columns: ["processo_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id", "escritorio_id"]
          },
        ]
      }
      lancamentos_financeiros: {
        Row: {
          categoria: string
          cliente_id: string | null
          created_at: string
          data_pagamento: string | null
          descricao: string
          escritorio_id: string
          id: string
          status: string
          tipo: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          categoria: string
          cliente_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descricao: string
          escritorio_id: string
          id?: string
          status?: string
          tipo: string
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          categoria?: string
          cliente_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descricao?: string
          escritorio_id?: string
          id?: string
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_cliente_tenant_fkey"
            columns: ["cliente_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id", "escritorio_id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          bloqueado_ate: string | null
          created_at: string
          email: string
          id: string
          ip_address: string | null
          tentativas: number
          updated_at: string
        }
        Insert: {
          bloqueado_ate?: string | null
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          tentativas?: number
          updated_at?: string
        }
        Update: {
          bloqueado_ate?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          tentativas?: number
          updated_at?: string
        }
        Relationships: []
      }
      parcelas: {
        Row: {
          created_at: string
          data_pagamento: string | null
          escritorio_id: string
          forma_pagamento: string | null
          honorario_id: string
          id: string
          numero_parcela: number
          observacoes: string | null
          status: string
          valor: number
          vencimento: string
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          escritorio_id: string
          forma_pagamento?: string | null
          honorario_id: string
          id?: string
          numero_parcela: number
          observacoes?: string | null
          status?: string
          valor: number
          vencimento: string
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          escritorio_id?: string
          forma_pagamento?: string | null
          honorario_id?: string
          id?: string
          numero_parcela?: number
          observacoes?: string | null
          status?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_honorario_id_fkey"
            columns: ["honorario_id"]
            isOneToOne: false
            referencedRelation: "honorarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_honorario_tenant_fkey"
            columns: ["honorario_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "honorarios"
            referencedColumns: ["id", "escritorio_id"]
          },
        ]
      }
      perfis_dados_pessoais: {
        Row: {
          cpf: string | null
          data_nascimento: string | null
          sexo: string | null
          telefone: string | null
          usuario_id: string
        }
        Insert: {
          cpf?: string | null
          data_nascimento?: string | null
          sexo?: string | null
          telefone?: string | null
          usuario_id: string
        }
        Update: {
          cpf?: string | null
          data_nascimento?: string | null
          sexo?: string | null
          telefone?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_dados_pessoais_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_clientes: {
        Row: {
          cliente_id: string
          papel: string
          processo_id: string
        }
        Insert: {
          cliente_id: string
          papel?: string
          processo_id: string
        }
        Update: {
          cliente_id?: string
          papel?: string
          processo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processo_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_clientes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_movimentacoes: {
        Row: {
          codigo_cnj: string | null
          complementos: Json | null
          data_hora: string | null
          data_movimento: string
          descricao: string
          escritorio_id: string
          fonte: string
          id: string
          processo_id: string
          synced_at: string
          visto_em: string | null
        }
        Insert: {
          codigo_cnj?: string | null
          complementos?: Json | null
          data_hora?: string | null
          data_movimento: string
          descricao: string
          escritorio_id: string
          fonte?: string
          id?: string
          processo_id: string
          synced_at?: string
          visto_em?: string | null
        }
        Update: {
          codigo_cnj?: string | null
          complementos?: Json | null
          data_hora?: string | null
          data_movimento?: string
          descricao?: string
          escritorio_id?: string
          fonte?: string
          id?: string
          processo_id?: string
          synced_at?: string
          visto_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processo_movimentacoes_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_movimentacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_movimentacoes_processo_tenant_fkey"
            columns: ["processo_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id", "escritorio_id"]
          },
        ]
      }
      processos: {
        Row: {
          advogado_id: string | null
          advogado_parte_contraria: string | null
          area_direito_id: number | null
          assunto_codigo: string | null
          assunto: string | null
          classe_codigo: string | null
          classe_processual: string | null
          codigo_municipio_ibge: string | null
          comarca: string | null
          created_at: string
          data_distribuicao: string | null
          data_requerimento: string | null
          datajud_atualizado_em: string | null
          escritorio_id: string
          etapa: string | null
          fase: string | null
          grau: string | null
          grupo_acao: string | null
          id: string
          nivel_sigilo: number
          numero_cnj_raw: string | null
          numero_cnj: string | null
          numero_protocolo: string | null
          observacoes: string | null
          parte_contraria: string | null
          pasta_caso: string | null
          processo_originario: string | null
          sistema: string | null
          status: string
          tipo_acao: string | null
          tribunal: string | null
          uf: string | null
          ultima_sync_cnj: string | null
          updated_at: string
          valor_causa: number | null
          vara: string | null
        }
        Insert: {
          advogado_id?: string | null
          area_direito_id?: number | null
          classe_processual?: string | null
          comarca?: string | null
          created_at?: string
          data_distribuicao?: string | null
          data_requerimento?: string | null
          escritorio_id: string
          etapa?: string | null
          fase?: string | null
          grupo_acao?: string | null
          id?: string
          numero_cnj?: string | null
          numero_cnj_raw?: string | null
          numero_protocolo?: string | null
          observacoes?: string | null
          pasta_caso?: string | null
          processo_originario?: string | null
          status?: string
          tipo_acao?: string | null
          tribunal?: string | null
          uf?: string | null
          ultima_sync_cnj?: string | null
          updated_at?: string
          valor_causa?: number | null
          vara?: string | null
        }
        Update: {
          advogado_id?: string | null
          area_direito_id?: number | null
          classe_processual?: string | null
          comarca?: string | null
          created_at?: string
          data_distribuicao?: string | null
          data_requerimento?: string | null
          escritorio_id?: string
          etapa?: string | null
          fase?: string | null
          grupo_acao?: string | null
          id?: string
          numero_cnj?: string | null
          numero_cnj_raw?: string | null
          numero_protocolo?: string | null
          observacoes?: string | null
          pasta_caso?: string | null
          processo_originario?: string | null
          status?: string
          tipo_acao?: string | null
          tribunal?: string | null
          uf?: string | null
          ultima_sync_cnj?: string | null
          updated_at?: string
          valor_causa?: number | null
          vara?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_advogado_id_fkey"
            columns: ["advogado_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_advogado_tenant_fkey"
            columns: ["advogado_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id", "escritorio_id"]
          },
          {
            foreignKeyName: "processos_area_direito_id_fkey"
            columns: ["area_direito_id"]
            isOneToOne: false
            referencedRelation: "areas_direito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cargo_id: string | null
          created_at: string
          email: string
          escritorio_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cargo_id?: string | null
          created_at?: string
          email: string
          escritorio_id: string
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cargo_id?: string | null
          created_at?: string
          email?: string
          escritorio_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_cargo_tenant_fkey"
            columns: ["cargo_id", "escritorio_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id", "escritorio_id"]
          },
          {
            foreignKeyName: "usuarios_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          ativo: boolean
          categoria: string | null
          corpo: string
          created_at: string
          escritorio_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          corpo: string
          created_at?: string
          escritorio_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          corpo?: string
          created_at?: string
          escritorio_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_parcelas: {
        Args: {
          p_data_primeira: string
          p_escritorio_id: string
          p_honorario_id: string
          p_n_parcelas: number
          p_valor_total: number
        }
        Returns: undefined
      }
      has_permission: {
        Args: { acao: string; modulo: string }
        Returns: boolean
      }
      my_escritorio_id: { Args: never; Returns: string }
      salvar_dados_pessoais_perfil: {
        Args: {
          p_cpf: string
          p_data_nascimento: string
          p_nome: string
          p_sexo: string
          p_telefone: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

