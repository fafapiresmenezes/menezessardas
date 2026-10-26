import { supabase, supabaseConfigurado } from './supabase'

const BUCKET = 'documentos'

const limparNome = (nome: string) =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80)

/**
 * Envia o arquivo ao bucket privado "documentos" e devolve o caminho guardado.
 * No modo fictício não há bucket: devolve '' e o documento fica só como registro.
 */
export async function enviarArquivo(arquivo: File, pasta: string): Promise<string> {
  if (!supabaseConfigurado) return ''
  const caminho = `${pasta}/${Date.now()}-${limparNome(arquivo.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    contentType: arquivo.type || 'application/octet-stream',
    upsert: false,
  })
  if (error) throw new Error(`Falha ao guardar o arquivo: ${error.message}`)
  return caminho
}

/** URL assinada (15 minutos) para abrir ou baixar um arquivo do bucket. */
export async function urlAssinada(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 15 * 60)
  if (error || !data) throw new Error(`Não foi possível gerar o link: ${error?.message ?? 'sem resposta'}`)
  return data.signedUrl
}

/** Apaga o arquivo do bucket; ignora caminhos vazios (registros sem arquivo). */
export async function apagarArquivo(caminho?: string): Promise<void> {
  if (!supabaseConfigurado || !caminho) return
  await supabase.storage.from(BUCKET).remove([caminho])
}
