'use client'

import { createContext, useContext, useEffect, useState } from 'react'

// i18n minimalista de propósito (decisão de escopo): dicionário + Context,
// sem rotas por idioma nem SEO multilíngue. Inglês é o padrão (público-alvo
// do portfólio); a escolha persiste em localStorage.
export type Lang = 'en' | 'fr' | 'pt'

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'pt', label: 'PT' },
]

export const LOCALES: Record<Lang, string> = { en: 'en-CA', fr: 'fr-CA', pt: 'pt-BR' }

const en = {
  'nav.projects': 'Projects',
  'nav.session': 'Session',
  'nav.logout': 'Log out',
  'nav.language': 'Language',
  'footer.engine':
    'Image engine: Gemini 3 Pro Image (Nano Banana Pro) · via Supabase Edge Function',

  'login.title.login': 'Log in',
  'login.title.signup': 'Create account',
  'login.sub.login': 'Sign in to generate urban intervention visualizations.',
  'login.sub.signup': 'Create an account to get started.',
  'login.fullName': 'Full name',
  'login.email': 'Email',
  'login.password': 'Password',
  'login.wait': 'Please wait…',
  'login.submit.login': 'Log in',
  'login.submit.signup': 'Create account',
  'login.switch.toSignup': "No account? Sign up",
  'login.switch.toLogin': 'Already have an account? Log in',
  'login.checkEmail.title': 'Check your email',
  'login.checkEmail.body':
    'We sent a confirmation link to {email}. Confirm your account, then log in.',
  'login.checkEmail.back': 'Back to login',

  'projects.title': 'Projects',
  'projects.subtitle': 'Locations and intersections being visualized',
  'projects.new': '+ New Project',
  'projects.empty':
    'No projects yet. Create the first one with a name, an address and a photo of the location.',
  'projects.noAddress': 'No address',

  'newProject.title': 'New Project',
  'newProject.subtitle': 'Location name, address and current photo',
  'newProject.name': 'Location name',
  'newProject.namePh': 'e.g., St. Paul St & Church St',
  'newProject.address': 'Address',
  'newProject.addressPh': 'e.g., St. Catharines, ON',
  'newProject.photo': 'Location photo',
  'newProject.dropzone': 'Click or drag a photo here (Street View or camera)',
  'newProject.changePhoto': 'Click or drag another photo to replace',
  'newProject.photoRequired': 'Select a photo of the location.',
  'newProject.creating': 'Creating…',
  'newProject.submit': 'Create Project',
  'newProject.createFail': 'Failed to create the project.',
  'newProject.uploadFail': 'Photo upload failed: {msg}',

  'project.generationsToday': 'GENERATIONS TODAY',
  'project.notFound.title': 'Project not found',
  'project.notFound.body': "This project doesn't exist or doesn't belong to your account.",
  'project.loading': 'Loading…',
  'project.interactive.title': 'Interactive Experience',
  'project.interactive.sub': 'Drag to compare the current scenario with the proposed intervention',
  'project.describe': 'Describe the intervention',
  'project.promptPh':
    'e.g., remove two car lanes, add a protected bike lane with a median, widen the sidewalk and plant native trees',
  'project.generate': 'Generate Visualization',
  'project.generating': 'Generating…',
  'project.generatingHint': 'Generating visualization… (may take around 30s)',
  'project.emptyHint': 'Describe the intervention below and click Generate Visualization.',
  'project.cost': '~US$0.13 · Gemini 3 Pro Image',
  'project.limitReachedShort': 'Daily limit of {n} reached',
  'project.limitReachedLong': 'Daily limit of {n} generations reached. Come back tomorrow.',
  'project.err.register': 'Failed to register the visualization.',
  'project.err.downloadOriginal': 'Failed to download the original photo.',
  'project.err.session': 'Session expired — log in again.',
  'project.err.http': 'Generation failed (HTTP {status}).',
  'project.err.saveGenerated': 'Failed to save the generated image: {msg}',
  'project.err.generic': 'Failed to generate the visualization.',

  'chips.bikeLane.label': 'Protected bike lane',
  'chips.bikeLane.text': 'protected bike lane with a separator median',
  'chips.trees.label': 'Tree planting',
  'chips.trees.text': 'tree planting with native trees',
  'chips.sidewalk.label': 'Widened sidewalk',
  'chips.sidewalk.text': 'widened sidewalk',
  'chips.furniture.label': 'Street furniture',
  'chips.furniture.text': 'street furniture (benches and bike racks)',
  'chips.addPrefix': 'Add',

  'split.before': '● BEFORE — CURRENT',
  'split.after': '● AFTER — PROPOSED',

  'history.title': 'Visualization History',
  'history.empty': 'No visualizations generated in this project yet.',
  'history.date': 'Date',
  'history.intervention': 'Intervention',
  'history.status': 'Status',
  'history.compare': 'compare',
  'history.showing': 'showing',
  'status.done': 'completed',
  'status.pending': 'pending',
  'status.failed': 'failed',

  'export.title': 'Export',
  'export.download': 'Download generated image',

  'sim.badge': 'SIMULATED DATA',
  'impact.title': 'Estimated Impact',
  'impact.note':
    'Illustrative example values — in production these would come from real project data, not fixed estimates.',
  'impact.carLanes': 'Car Lanes',
  'impact.greenArea': 'Green Area',
  'impact.cyclistCapacity': 'Cyclist Capacity',
  'impact.traffic': 'Traffic Impact',
  'impact.traffic.value': 'To assess',
  'elements.title': 'Proposal Elements',
  'elements.bikeLane': 'Protected bike lane (2-way)',
  'elements.median': 'Separator median',
  'elements.sidewalk': 'Widened sidewalk (+1.2 m)',
  'elements.trees': 'Tree planting (12 trees)',
  'elements.furniture': 'Street furniture',
}

type MessageKey = keyof typeof en

const fr: Record<MessageKey, string> = {
  'nav.projects': 'Projets',
  'nav.session': 'Session',
  'nav.logout': 'Se déconnecter',
  'nav.language': 'Langue',
  'footer.engine':
    "Moteur d'image : Gemini 3 Pro Image (Nano Banana Pro) · via Supabase Edge Function",

  'login.title.login': 'Connexion',
  'login.title.signup': 'Créer un compte',
  'login.sub.login': "Connectez-vous pour générer des visualisations d'interventions urbaines.",
  'login.sub.signup': 'Créez un compte pour commencer.',
  'login.fullName': 'Nom complet',
  'login.email': 'Courriel',
  'login.password': 'Mot de passe',
  'login.wait': 'Veuillez patienter…',
  'login.submit.login': 'Se connecter',
  'login.submit.signup': 'Créer un compte',
  'login.switch.toSignup': 'Pas de compte ? Inscrivez-vous',
  'login.switch.toLogin': 'Vous avez déjà un compte ? Connectez-vous',
  'login.checkEmail.title': 'Vérifiez votre courriel',
  'login.checkEmail.body':
    'Nous avons envoyé un lien de confirmation à {email}. Confirmez votre compte, puis connectez-vous.',
  'login.checkEmail.back': 'Retour à la connexion',

  'projects.title': 'Projets',
  'projects.subtitle': 'Lieux et intersections en cours de visualisation',
  'projects.new': '+ Nouveau projet',
  'projects.empty':
    'Aucun projet pour le moment. Créez le premier avec un nom, une adresse et une photo du lieu.',
  'projects.noAddress': 'Sans adresse',

  'newProject.title': 'Nouveau projet',
  'newProject.subtitle': 'Nom du lieu, adresse et photo actuelle',
  'newProject.name': 'Nom du lieu',
  'newProject.namePh': 'ex. : St. Paul St & Church St',
  'newProject.address': 'Adresse',
  'newProject.addressPh': 'ex. : St. Catharines, ON',
  'newProject.photo': 'Photo du lieu',
  'newProject.dropzone': 'Cliquez ou glissez une photo ici (Street View ou caméra)',
  'newProject.changePhoto': 'Cliquez ou glissez une autre photo pour remplacer',
  'newProject.photoRequired': 'Sélectionnez une photo du lieu.',
  'newProject.creating': 'Création…',
  'newProject.submit': 'Créer le projet',
  'newProject.createFail': 'Échec de la création du projet.',
  'newProject.uploadFail': 'Échec du téléversement de la photo : {msg}',

  'project.generationsToday': "GÉNÉRATIONS AUJOURD'HUI",
  'project.notFound.title': 'Projet introuvable',
  'project.notFound.body': "Ce projet n'existe pas ou n'appartient pas à votre compte.",
  'project.loading': 'Chargement…',
  'project.interactive.title': 'Expérience interactive',
  'project.interactive.sub':
    "Faites glisser pour comparer le scénario actuel avec l'intervention proposée",
  'project.describe': "Décrire l'intervention",
  'project.promptPh':
    'ex. : retirer deux voies auto, ajouter une piste cyclable protégée avec terre-plein, élargir le trottoir et planter des arbres indigènes',
  'project.generate': 'Générer la visualisation',
  'project.generating': 'Génération…',
  'project.generatingHint': 'Génération de la visualisation… (environ 30 s)',
  'project.emptyHint':
    "Décrivez l'intervention ci-dessous et cliquez sur Générer la visualisation.",
  'project.cost': '~0,13 $US · Gemini 3 Pro Image',
  'project.limitReachedShort': 'Limite quotidienne de {n} atteinte',
  'project.limitReachedLong': 'Limite quotidienne de {n} générations atteinte. Revenez demain.',
  'project.err.register': "Échec de l'enregistrement de la visualisation.",
  'project.err.downloadOriginal': 'Échec du téléchargement de la photo originale.',
  'project.err.session': 'Session expirée — reconnectez-vous.',
  'project.err.http': 'Échec de la génération (HTTP {status}).',
  'project.err.saveGenerated': "Échec de l'enregistrement de l'image générée : {msg}",
  'project.err.generic': 'Échec de la génération de la visualisation.',

  'chips.bikeLane.label': 'Piste cyclable protégée',
  'chips.bikeLane.text': 'piste cyclable protégée avec terre-plein séparateur',
  'chips.trees.label': 'Plantation d’arbres',
  'chips.trees.text': "plantation d'arbres indigènes",
  'chips.sidewalk.label': 'Trottoir élargi',
  'chips.sidewalk.text': 'trottoir élargi',
  'chips.furniture.label': 'Mobilier urbain',
  'chips.furniture.text': 'mobilier urbain (bancs et supports à vélos)',
  'chips.addPrefix': 'Ajouter',

  'split.before': '● AVANT — ACTUEL',
  'split.after': '● APRÈS — PROPOSITION',

  'history.title': 'Historique des visualisations',
  'history.empty': 'Aucune visualisation générée dans ce projet pour le moment.',
  'history.date': 'Date',
  'history.intervention': 'Intervention',
  'history.status': 'Statut',
  'history.compare': 'comparer',
  'history.showing': 'affichée',
  'status.done': 'terminée',
  'status.pending': 'en attente',
  'status.failed': 'échouée',

  'export.title': 'Exporter',
  'export.download': "Télécharger l'image générée",

  'sim.badge': 'DONNÉES SIMULÉES',
  'impact.title': 'Impact estimé',
  'impact.note':
    "Valeurs d'exemple illustratives — en production, elles proviendraient de données réelles du projet, pas d'estimations fixes.",
  'impact.carLanes': 'Voies auto',
  'impact.greenArea': 'Espace vert',
  'impact.cyclistCapacity': 'Capacité cyclistes',
  'impact.traffic': 'Impact trafic',
  'impact.traffic.value': 'À évaluer',
  'elements.title': 'Éléments de la proposition',
  'elements.bikeLane': 'Piste cyclable protégée (bidirectionnelle)',
  'elements.median': 'Terre-plein séparateur',
  'elements.sidewalk': 'Trottoir élargi (+1,2 m)',
  'elements.trees': "Plantation d'arbres (12 arbres)",
  'elements.furniture': 'Mobilier urbain',
}

const pt: Record<MessageKey, string> = {
  'nav.projects': 'Projetos',
  'nav.session': 'Sessão',
  'nav.logout': 'Sair',
  'nav.language': 'Idioma',
  'footer.engine':
    'Motor de imagem: Gemini 3 Pro Image (Nano Banana Pro) · via Supabase Edge Function',

  'login.title.login': 'Entrar',
  'login.title.signup': 'Criar conta',
  'login.sub.login': 'Acesse para gerar visualizações de intervenções urbanas.',
  'login.sub.signup': 'Crie uma conta para começar.',
  'login.fullName': 'Nome completo',
  'login.email': 'E-mail',
  'login.password': 'Senha',
  'login.wait': 'Aguarde…',
  'login.submit.login': 'Entrar',
  'login.submit.signup': 'Criar conta',
  'login.switch.toSignup': 'Não tem conta? Cadastre-se',
  'login.switch.toLogin': 'Já tem conta? Entre',
  'login.checkEmail.title': 'Confira seu e-mail',
  'login.checkEmail.body':
    'Enviamos um link de confirmação para {email}. Confirme a conta e faça login.',
  'login.checkEmail.back': 'Voltar ao login',

  'projects.title': 'Projetos',
  'projects.subtitle': 'Locais e intersecções sendo visualizados',
  'projects.new': '+ Novo Projeto',
  'projects.empty':
    'Nenhum projeto ainda. Crie o primeiro com nome, endereço e uma foto do local.',
  'projects.noAddress': 'Sem endereço',

  'newProject.title': 'Novo Projeto',
  'newProject.subtitle': 'Nome do local, endereço e foto atual',
  'newProject.name': 'Nome do local',
  'newProject.namePh': 'ex: St. Paul St & Church St',
  'newProject.address': 'Endereço',
  'newProject.addressPh': 'ex: St. Catharines, ON',
  'newProject.photo': 'Foto do local',
  'newProject.dropzone': 'Clique ou arraste a foto aqui (Street View ou câmera)',
  'newProject.changePhoto': 'Clique ou arraste outra foto para substituir',
  'newProject.photoRequired': 'Selecione uma foto do local.',
  'newProject.creating': 'Criando…',
  'newProject.submit': 'Criar Projeto',
  'newProject.createFail': 'Falha ao criar o projeto.',
  'newProject.uploadFail': 'Falha no upload da foto: {msg}',

  'project.generationsToday': 'GERAÇÕES HOJE',
  'project.notFound.title': 'Projeto não encontrado',
  'project.notFound.body': 'Este projeto não existe ou não pertence à sua conta.',
  'project.loading': 'Carregando…',
  'project.interactive.title': 'Experiência Interativa',
  'project.interactive.sub': 'Arraste para comparar o cenário atual com a intervenção proposta',
  'project.describe': 'Descrever a intervenção',
  'project.promptPh':
    'ex: remover duas faixas de carro, adicionar ciclovia protegida com canteiro, alargar calçada e plantar árvores nativas',
  'project.generate': 'Gerar Visualização',
  'project.generating': 'Gerando…',
  'project.generatingHint': 'Gerando visualização… (pode levar em torno de 30s)',
  'project.emptyHint': 'Descreva a intervenção abaixo e clique em Gerar Visualização.',
  'project.cost': '~US$0,13 · Gemini 3 Pro Image',
  'project.limitReachedShort': 'Limite diário de {n} atingido',
  'project.limitReachedLong': 'Limite diário de {n} gerações atingido. Volte amanhã.',
  'project.err.register': 'Falha ao registrar a visualização.',
  'project.err.downloadOriginal': 'Falha ao baixar a foto original.',
  'project.err.session': 'Sessão expirada — faça login novamente.',
  'project.err.http': 'Falha na geração (HTTP {status}).',
  'project.err.saveGenerated': 'Falha ao salvar a imagem gerada: {msg}',
  'project.err.generic': 'Falha ao gerar a visualização.',

  'chips.bikeLane.label': 'Ciclovia protegida',
  'chips.bikeLane.text': 'ciclovia protegida com canteiro separador',
  'chips.trees.label': 'Arborização',
  'chips.trees.text': 'arborização com árvores nativas',
  'chips.sidewalk.label': 'Calçada alargada',
  'chips.sidewalk.text': 'calçada alargada',
  'chips.furniture.label': 'Mobiliário urbano',
  'chips.furniture.text': 'mobiliário urbano (bancos e paraciclos)',
  'chips.addPrefix': 'Adicionar',

  'split.before': '● ANTES — ATUAL',
  'split.after': '● DEPOIS — PROPOSTA',

  'history.title': 'Histórico de Visualizações',
  'history.empty': 'Nenhuma visualização gerada neste projeto ainda.',
  'history.date': 'Data',
  'history.intervention': 'Intervenção',
  'history.status': 'Status',
  'history.compare': 'comparar',
  'history.showing': 'exibindo',
  'status.done': 'concluída',
  'status.pending': 'pendente',
  'status.failed': 'falhou',

  'export.title': 'Exportar',
  'export.download': 'Baixar imagem gerada',

  'sim.badge': 'DADOS SIMULADOS',
  'impact.title': 'Impacto Estimado',
  'impact.note':
    'Valores de exemplo ilustrativos — em produção viriam de dados reais do projeto, não de estimativas fixas.',
  'impact.carLanes': 'Faixas de Carro',
  'impact.greenArea': 'Área Verde',
  'impact.cyclistCapacity': 'Capacidade Ciclistas',
  'impact.traffic': 'Impacto no Tráfego',
  'impact.traffic.value': 'A avaliar',
  'elements.title': 'Elementos da Proposta',
  'elements.bikeLane': 'Ciclovia protegida (2 vias)',
  'elements.median': 'Canteiro separador',
  'elements.sidewalk': 'Calçada alargada (+1,2m)',
  'elements.trees': 'Arborização (12 árvores)',
  'elements.furniture': 'Mobiliário urbano',
}

const messages: Record<Lang, Record<MessageKey, string>> = { en, fr, pt }

export type TFunction = (key: MessageKey, vars?: Record<string, string | number>) => string

type I18nContextValue = { lang: Lang; setLang: (lang: Lang) => void; t: TFunction }

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'sv-lang'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'fr' || stored === 'pt') setLangState(stored)
  }, [])

  useEffect(() => {
    document.documentElement.lang = LOCALES[lang]
  }, [lang])

  function setLang(next: Lang) {
    setLangState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  const t: TFunction = (key, vars) => {
    let text = messages[lang][key] ?? en[key] ?? key
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(value))
      }
    }
    return text
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>')
  return ctx
}
