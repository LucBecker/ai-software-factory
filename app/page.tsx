
"use client";

import { useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  name: string;
  description: string;
  stage: string;
  progress: number;
};

type Requirement = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  projectId: string;
};

type ArchitectureDecision = {
  id: string;
  title: string;
  description: string;
  category: string;
  projectId: string;
};

type Prompt = {
  title: string;
  category: string;
  description: string;
};

const initialProjects: Project[] = []

const prompts: Prompt[] = [
  {
    title: "Descoberta de produto",
    category: "Brainstorming",
    description: "Entender o problema, os usuários e as funcionalidades do MVP.",
  },
  {
    title: "Especificação funcional",
    category: "Specification",
    description: "Criar requisitos, regras de negócio e critérios de aceite.",
  },
  {
    title: "Arquiteto de software",
    category: "Plan",
    description: "Definir arquitetura, dados, APIs e plano de implementação.",
  },
  {
    title: "Auditoria de segurança",
    category: "Audit",
    description: "Revisar vulnerabilidades, permissões e proteção de dados.",
  },
  {
    title: "Desenvolvedor sênior",
    category: "Implementação",
    description: "Implementar funcionalidades seguindo os requisitos aprovados.",
  },
  {
    title: "Engenheiro de testes",
    category: "Qualidade",
    description: "Criar testes e validar os critérios de aceite.",
  },
];

const stages = [
  {
    key: "Brainstorming",
    number: "01",
    title: "Descoberta",
    description: "Entender o problema e definir o MVP.",
  },
  {
    key: "Specification",
    number: "02",
    title: "Especificação",
    description: "Documentar requisitos e regras de negócio.",
  },
  {
    key: "Plan",
    number: "03",
    title: "Planejamento",
    description: "Desenhar arquitetura e plano técnico.",
  },
  {
    key: "Audit",
    number: "04",
    title: "Auditoria",
    description: "Validar qualidade e segurança.",
  },
];

export default function Home() {
  const [page, setPage] = useState("Visão geral");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [requirementTitle, setRequirementTitle] = useState("");
  const [architectureDecisions, setArchitectureDecisions] = useState<ArchitectureDecision[]>([]);
  const [architectureTitle, setArchitectureTitle] = useState("");
  const [architectureDescription, setArchitectureDescription] = useState("");
  const [architectureCategory, setArchitectureCategory] = useState("GENERAL");
  const [architectureLoading, setArchitectureLoading] = useState(false);
  const [architectureError, setArchitectureError] = useState("");
  const [architectureSuccess, setArchitectureSuccess] = useState("");
  const [analysisOutput, setAnalysisOutput] = useState("");
  const [analysisRunId, setAnalysisRunId] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [editingArchitectureDecisionId, setEditingArchitectureDecisionId] = useState<string | null>(null);
  const [editArchitectureTitle, setEditArchitectureTitle] = useState("");
  const [editArchitectureDescription, setEditArchitectureDescription] = useState("");
  const [editArchitectureCategory, setEditArchitectureCategory] = useState("GENERAL");
  const [editingArchitectureError, setEditingArchitectureError] = useState("");
  const [savingArchitectureEdit, setSavingArchitectureEdit] = useState(false);
  const [requirementDescription, setRequirementDescription] = useState("");
  const [requirementPriority, setRequirementPriority] = useState("MEDIUM");
  const [editingRequirementId, setEditingRequirementId] = useState<string | null>(null);
  const [editRequirementTitle, setEditRequirementTitle] = useState("");
  const [editRequirementDescription, setEditRequirementDescription] = useState("");
  const [editRequirementPriority, setEditRequirementPriority] = useState("MEDIUM");
  const [editingRequirementError, setEditingRequirementError] = useState("");
  const [savingRequirementEdit, setSavingRequirementEdit] = useState(false);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [requirementError, setRequirementError] = useState("");
  const [requirementSuccess, setRequirementSuccess] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [showForm, setShowForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [selectedStage, setSelectedStage] = useState("Brainstorming");
  const [copiedPrompt, setCopiedPrompt] = useState("");

  const filteredPrompts = useMemo(
    () =>
      prompts.filter(
        (prompt) =>
          (category === "Todas" || prompt.category === category) &&
          `${prompt.title} ${prompt.description} ${prompt.category}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [search, category],
  );

  useEffect(() => {
  async function loadProjects() {
    try {
      setProjectError("");

      const response = await fetch("/api/projects");

      if (!response.ok) {
        throw new Error("Não foi possível carregar os projetos.");
      }

      const data: {
        id: string;
        name: string;
        description: string | null;
        stage: string;
      }[] = await response.json();

      const loadedProjects: Project[] = data.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description ?? "",
        stage: project.stage,
        progress: 0,
      }));

      setProjects(loadedProjects);
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);

      setProjectError(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao carregar projetos.",
      );
    } finally {
      setLoadingProjects(false);
    }
  }

  loadProjects();
}, []);

useEffect(() => {
  if (!selectedProject) {
    setRequirements([]);
    return;
  }
  const projectId = selectedProject.id;
  let cancelled = false;

  async function loadRequirements() {
    setRequirementsLoading(true);
    setRequirementError("");

    try {
      const response = await fetch(
        `/api/requirements?projectId=${encodeURIComponent(projectId)}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar requisitos.");
      }

      if (!cancelled) {
        setRequirements(data as Requirement[]);
      }
    } catch (error) {
      if (!cancelled) {
        setRequirementError(
          error instanceof Error
            ? error.message
            : "Erro inesperado ao carregar requisitos.",
        );
      }
    } finally {
      if (!cancelled) {
        setRequirementsLoading(false);
      }
    }
  }

  loadRequirements();

  return () => {
    cancelled = true;
  };
}, [selectedProject]);

useEffect(() => {
  if (!selectedProject) {
    setArchitectureDecisions([]);
    return;
  }

  const projectId = selectedProject.id;
  let cancelled = false;

  async function loadArchitectureDecisions() {
    setArchitectureLoading(true);
    setArchitectureError("");

    try {
      const response = await fetch(
        `/api/architecture-decisions?projectId=${encodeURIComponent(projectId)}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Erro ao carregar decisões de arquitetura.",
        );
      }

      if (!cancelled) {
        setArchitectureDecisions(data as ArchitectureDecision[]);
      }
    } catch (error) {
      if (!cancelled) {
        setArchitectureError(
          error instanceof Error
            ? error.message
            : "Erro inesperado ao carregar a arquitetura.",
        );
      }
    } finally {
      if (!cancelled) {
        setArchitectureLoading(false);
      }
    }
  }

  loadArchitectureDecisions();

  return () => {
    cancelled = true;
  };
}, [selectedProject]);

async function runRequirementsAnalysis() {
  if (!selectedProject) return;

  const projectId = selectedProject.id;

  setAnalysisLoading(true);
  setAnalysisError("");
  setAnalysisOutput("");
  setAnalysisRunId(null);

  try {
    const response = await fetch("/api/requirements-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Não foi possível executar a análise.",
      );
    }

    setAnalysisOutput(data.output || "");
    setAnalysisRunId(data.runId || null);
  } catch (error) {
    setAnalysisError(
      error instanceof Error
        ? error.message
        : "Erro inesperado ao executar a análise.",
    );
  } finally {
    setAnalysisLoading(false);
  }
}

async function createProject(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!projectName.trim()) return;

  try {
    setProjectError("");
    console.log("Enviando requisição para API");
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName.trim(),
        description: projectDescription.trim(),
      }),
    });
    console.log("Resposta da API:", response.status);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível criar o projeto.");
    }

    const newProject: Project = {
      id: data.id,
      name: data.name,
      description: data.description,
      stage: data.stage,
      progress: 0,
    };

    setProjects((current) => [newProject, ...current]);
    setProjectName("");
    setProjectDescription("");
    setShowForm(false);
    setPage("Projetos");
  } catch (error) {
    setProjectError(
      error instanceof Error
        ? error.message
        : "Erro inesperado ao criar projeto.",
    );
  }
}

  async function createRequirement(
  event: React.FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  if (!selectedProject || !requirementTitle.trim()) {
    return;
  }

  setRequirementError("");
  setRequirementSuccess("");

  try {
    const response = await fetch("/api/requirements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: selectedProject.id,
        title: requirementTitle.trim(),
        description: requirementDescription.trim(),
        priority: requirementPriority,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível salvar o requisito.");
    }

    setRequirements((current) => [
      data as Requirement,
      ...current,
    ]);

    setRequirementTitle("");
    setRequirementDescription("");
    setRequirementPriority("MEDIUM");
    setRequirementSuccess("Requisito cadastrado com sucesso.");
  } catch (error) {
    setRequirementError(
      error instanceof Error
        ? error.message
        : "Erro inesperado ao salvar o requisito.",
    );
  }
}

function startEditingRequirement(requirement: Requirement) {
  setEditingRequirementId(requirement.id);
  setEditRequirementTitle(requirement.title);
  setEditRequirementDescription(requirement.description);
  setEditRequirementPriority(requirement.priority);
  setEditingRequirementError("");
  setRequirementError("");
  setRequirementSuccess("");
}

async function saveRequirementEdit(
  event: React.FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  if (!selectedProject || !editingRequirementId) return;

  if (!editRequirementTitle.trim()) {
    setEditingRequirementError("Informe o título do requisito.");
    return;
  }

  setEditingRequirementError("");
  setSavingRequirementEdit(true);

  try {
    const response = await fetch("/api/requirements", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingRequirementId,
        projectId: selectedProject.id,
        title: editRequirementTitle.trim(),
        description: editRequirementDescription.trim(),
        priority: editRequirementPriority,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Não foi possível atualizar o requisito.",
      );
    }

    setRequirements((current) =>
      current.map((item) =>
        item.id === data.id ? (data as Requirement) : item,
      ),
    );

    setEditingRequirementId(null);
    setEditRequirementTitle("");
    setEditRequirementDescription("");
    setEditRequirementPriority("MEDIUM");
    setRequirementSuccess("Requisito atualizado com sucesso.");
  } catch (error) {
    setEditingRequirementError(
      error instanceof Error
        ? error.message
        : "Erro inesperado ao atualizar o requisito.",
    );
  } finally {
    setSavingRequirementEdit(false);
  }
}

async function deleteRequirement(requirement: Requirement) {
  if (!selectedProject) return;

  const confirmed = window.confirm(
    `Deseja realmente excluir o requisito "${requirement.title}"?`,
  );

  if (!confirmed) return;

  setRequirementError("");
  setRequirementSuccess("");

  try {
    const response = await fetch("/api/requirements", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: requirement.id,
        projectId: selectedProject.id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Não foi possível excluir o requisito.",
      );
    }

    setRequirements((current) =>
      current.filter((item) => item.id !== requirement.id),
    );

    setRequirementSuccess("Requisito excluído com sucesso.");
  } catch (error) {
    setRequirementError(
      error instanceof Error
        ? error.message
        : "Erro inesperado ao excluir o requisito.",
    );
  }
}

  async function deleteArchitectureDecision(
  decision: ArchitectureDecision,
) {
  if (!selectedProject) return;

  const confirmed = window.confirm(
    `Deseja realmente excluir a decisão "${decision.title}"?`,
  );

  if (!confirmed) return;

  setArchitectureError("");
  setArchitectureSuccess("");

  try {
    const response = await fetch("/api/architecture-decisions", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: decision.id,
        projectId: selectedProject.id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Não foi possível excluir a decisão.",
      );
    }

    setArchitectureDecisions((current) =>
      current.filter((item) => item.id !== decision.id),
    );

    setArchitectureSuccess("Decisão de arquitetura excluída com sucesso.");
  } catch (error) {
    setArchitectureError(
      error instanceof Error
        ? error.message
        : "Erro inesperado ao excluir a decisão.",
    );
  }
}

  function startEditingArchitectureDecision(
  decision: ArchitectureDecision,
) {
  setEditingArchitectureDecisionId(decision.id);
  setEditArchitectureTitle(decision.title);
  setEditArchitectureDescription(decision.description);
  setEditArchitectureCategory(decision.category);
  setEditingArchitectureError("");
  setArchitectureError("");
  setArchitectureSuccess("");
}

async function saveArchitectureEdit(
  event: React.FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  if (!selectedProject || !editingArchitectureDecisionId) {
    return;
  }

  if (!editArchitectureTitle.trim()) {
    setEditingArchitectureError("Informe o título da decisão.");
    return;
  }

  setEditingArchitectureError("");
  setSavingArchitectureEdit(true);

  try {
    const response = await fetch("/api/architecture-decisions", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingArchitectureDecisionId,
        projectId: selectedProject.id,
        title: editArchitectureTitle.trim(),
        description: editArchitectureDescription.trim(),
        category: editArchitectureCategory,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Não foi possível atualizar a decisão.",
      );
    }

    setArchitectureDecisions((current) =>
      current.map((item) =>
        item.id === data.id
          ? (data as ArchitectureDecision)
          : item,
      ),
    );

    setEditingArchitectureDecisionId(null);
    setEditArchitectureTitle("");
    setEditArchitectureDescription("");
    setEditArchitectureCategory("GENERAL");
    setArchitectureSuccess("Decisão de arquitetura atualizada com sucesso.");
  } catch (error) {
    setEditingArchitectureError(
      error instanceof Error
        ? error.message
        : "Erro inesperado ao atualizar a decisão.",
    );
  } finally {
    setSavingArchitectureEdit(false);
  }
}

  async function createArchitectureDecision(
  event: React.FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  if (!selectedProject || !architectureTitle.trim()) {
    return;
  }

  setArchitectureError("");
  setArchitectureSuccess("");

  try {
    const response = await fetch("/api/architecture-decisions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: selectedProject.id,
        title: architectureTitle.trim(),
        description: architectureDescription.trim(),
        category: architectureCategory,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Não foi possível salvar a decisão de arquitetura.",
      );
    }

    setArchitectureDecisions((current) => [
      data as ArchitectureDecision,
      ...current,
    ]);

    setArchitectureTitle("");
    setArchitectureDescription("");
    setArchitectureCategory("GENERAL");
    setArchitectureSuccess("Decisão de arquitetura cadastrada com sucesso.");
  } catch (error) {
    setArchitectureError(
      error instanceof Error
        ? error.message
        : "Erro inesperado ao salvar a decisão de arquitetura.",
    );
  }
}
  async function copyPrompt(prompt: Prompt) {
    const text = `Atue como especialista em ${prompt.title}.\n\nObjetivo: ${prompt.description}\n\nProjeto: [DESCREVA SEU PROJETO]\n\nTrabalhe com requisitos explícitos, registre dúvidas, produza entregáveis verificáveis e aguarde aprovação antes de avançar para etapas críticas.`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrompt(prompt.title);
      window.setTimeout(() => setCopiedPrompt(""), 2000);
    } catch {
      window.prompt("Copie seu prompt:", text);
    }
  }

  const menu = [
    { name: "Visão geral", icon: "▦" },
    { name: "Projetos", icon: "▣" },
    { name: "Biblioteca de prompts", icon: "▤" },
    { name: "Agentes de IA", icon: "✳" },
    { name: "Fluxos de trabalho", icon: "⇄" },
  ];

  return (
    <main className="min-h-screen bg-[#0b1020] text-slate-100 md:flex">
      <aside className="border-b border-white/10 bg-[#0e1426] p-5 md:sticky md:top-0 md:h-screen md:w-[250px] md:shrink-0 md:border-b-0 md:border-r">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 text-2xl font-bold">
            AI
          </div>
          <div>
            <h1 className="font-semibold tracking-tight">Software Factory</h1>
            <p className="text-xs text-slate-400">AI-powered development</p>
          </div>
        </div>

        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">
          Workspace
        </p>

        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {menu.map((item) => (
            <button
              key={item.name}
              onClick={() => setPage(item.name)}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                page === item.name
                  ? "bg-indigo-500/15 font-medium text-indigo-300 ring-1 ring-indigo-400/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="mt-8 hidden rounded-2xl border border-white/10 bg-white/[.03] p-4 md:block">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <span className="text-emerald-400">●</span>
            Ambiente local
          </div>
          <p className="text-xs leading-5 text-slate-400">
            Seu workspace está pronto para evoluir. A integração com modelos de
            IA será configurada em uma próxima etapa.
          </p>
        </div>

        <div className="mt-5 hidden text-xs text-slate-500 md:block">
          AI Software Factory · MVP 0.1
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-9">
          <div>
            <p className="text-xs text-slate-500">Workspace / {page}</p>
            <h2 className="mt-1 text-lg font-semibold">{page}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300 sm:inline-flex">
              ● Sistema local
            </span>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              + Novo projeto
            </button>
          </div>
        </header>

        <div className="mx-auto w-full min-w-0 max-w-[1440px] p-5 md:p-9">
          {page === "Visão geral" && (
            <>
              <div className="mb-8">
                <p className="mb-2 text-sm text-indigo-300">
                  SUA FÁBRICA DE SOFTWARE
                </p>
                <h3 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Transforme ideias em{" "}
                  <span className="text-indigo-400">software real.</span>
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Organize requisitos, orquestre agentes especializados e
                  desenvolva aplicações com um fluxo controlado, documentado
                  e auditável.
                </p>
              </div>

              <div className="mb-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Projetos",
                    value: projects.length,
                    icon: "▣",
                    color: "text-indigo-300",
                  },
                  {
                    label: "Prompts disponíveis",
                    value: prompts.length,
                    icon: "▤",
                    color: "text-sky-300",
                  },
                  {
                    label: "Etapas do processo",
                    value: stages.length,
                    icon: "⇄",
                    color: "text-violet-300",
                  },
                  {
                    label: "Agentes configurados",
                    value: 4,
                    icon: "✳",
                    color: "text-emerald-300",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-[#11182b] p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        {stat.label}
                      </span>
                      <span className={`text-xl ${stat.color}`}>
                        {stat.icon}
                      </span>
                    </div>
                    <p className="mt-4 text-3xl font-semibold">{stat.value}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {stat.label === "Projetos"
                        ? "No workspace atual"
                        : "Disponíveis no MVP"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mb-9 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                <div className="rounded-2xl border border-white/10 bg-[#11182b] p-5 md:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Pipeline de desenvolvimento</h4>
                      <p className="mt-1 text-xs text-slate-400">
                        Método BSPA para organizar cada entrega
                      </p>
                    </div>
                    <span className="rounded-lg bg-indigo-400/10 px-3 py-1.5 text-xs text-indigo-300">
                      4 etapas
                    </span>
                  </div>

                  <div className="space-y-3">
                    {stages.map((stage, index) => (
                      <button
                        key={stage.key}
                        onClick={() => {
                          setSelectedStage(stage.key);
                          setPage("Fluxos de trabalho");
                        }}
                        className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition hover:border-indigo-400/40 ${
                          selectedStage === stage.key
                            ? "border-indigo-400/40 bg-indigo-400/[.06]"
                            : "border-white/[.07] bg-white/[.02]"
                        }`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm text-indigo-300">
                          {stage.number}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {stage.title}
                          </span>
                          <span className="mt-1 block text-xs text-slate-400">
                            {stage.description}
                          </span>
                        </span>
                        <span className="text-slate-500">
                          {index === 0 ? "→" : "↗"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 to-[#11182b] p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-400/15 text-2xl text-indigo-300">
                    ✳
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                    Próxima evolução
                  </p>
                  <h4 className="mt-3 text-xl font-semibold">
                    Agentes trabalhando em conjunto
                  </h4>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Vamos conectar a biblioteca de prompts a agentes de
                    descoberta, arquitetura, desenvolvimento e auditoria.
                  </p>
                  <button
                    onClick={() => setPage("Agentes de IA")}
                    className="mt-6 rounded-xl border border-indigo-400/30 px-4 py-2.5 text-sm text-indigo-200 transition hover:bg-indigo-400/10"
                  >
                    Explorar agentes →
                  </button>
                </div>
              </div>

              <ProjectList
                projects={projects.slice(0, 3)}
                onView={() => setPage("Projetos")}
                onSelectProject={(project) => {
                  setSelectedProject(project);
                  setPage("Detalhes do projeto");
                }}
              />
            </>
          )}

          {page === "Projetos" && (
            <>
              <SectionTitle
                title="Seus projetos"
                description="Organize aplicações, acompanhe o progresso e planeje cada entrega."
              />
              <ProjectList
                projects={projects}
                onView={() => setShowForm(true)}
                onSelectProject={(project) => {
                  setSelectedProject(project);
                  setPage("Detalhes do projeto");
                }}
                showAction
              />
            </>
          )}

          {page === "Detalhes do projeto" && selectedProject && (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setPage("Projetos")}
                className="text-sm text-indigo-300 transition hover:text-indigo-200"
              >
                ← Voltar para projetos
              </button>

              <SectionTitle
                title={selectedProject.name}
                description={
                  selectedProject.description || "Nenhuma descrição cadastrada."
                }
              />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#11182b] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold">Requisitos</h3>
              <span className="rounded-full bg-indigo-400/10 px-3 py-1 text-xs text-indigo-300">
                Em preparação
              </span>
            </div>

            <p className="text-sm leading-6 text-slate-400">
              Organize as necessidades do produto, as funcionalidades esperadas
              e as regras de negócio.
            </p>

            <div className="mt-5 space-y-4">
  <form
    onSubmit={createRequirement}
    className="space-y-3 rounded-xl border border-white/10 p-4"
  >
    <div>
      <label
        htmlFor="requirement-title"
        className="mb-1 block text-sm font-medium"
      >
        Título do requisito
      </label>

      <input
        id="requirement-title"
        value={requirementTitle}
        onChange={(event) => setRequirementTitle(event.target.value)}
        placeholder="Ex.: Permitir login com e-mail e senha"
        maxLength={120}
        required
        className="w-full min-w-0 rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>

    <div>
      <label
        htmlFor="requirement-description"
        className="mb-1 block text-sm font-medium"
      >
        Descrição
      </label>

      <textarea
        id="requirement-description"
        value={requirementDescription}
        onChange={(event) =>
          setRequirementDescription(event.target.value)
        }
        placeholder="Descreva o comportamento esperado..."
        maxLength={2000}
        rows={3}
        className="w-full min-w-0 resize-y rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <label
          htmlFor="requirement-priority"
          className="mb-1 block text-sm font-medium"
        >
          Prioridade
        </label>

        <select
          id="requirement-priority"
          value={requirementPriority}
          onChange={(event) =>
            setRequirementPriority(event.target.value)
          }
          className="w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Média</option>
          <option value="HIGH">Alta</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={!requirementTitle.trim()}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Adicionar requisito
      </button>
    </div>

    {requirementError && (
      <p role="alert" className="text-sm text-red-400">
        {requirementError}
      </p>
    )}

    {requirementSuccess && (
      <p role="status" className="text-sm text-emerald-400">
        {requirementSuccess}
      </p>
    )}
  </form>

  {requirementsLoading ? (
    <p className="text-sm text-slate-400">
      Carregando requisitos...
    </p>
  ) : requirements.length === 0 ? (
    <div className="rounded-xl border border-dashed border-white/10 p-4">
      <p className="text-sm text-slate-400">
        Nenhum requisito cadastrado ainda.
      </p>
    </div>
  ) : (
    <div className="space-y-3">
      {requirements.map((requirement) => (
  <div
    key={requirement.id}
    className="rounded-xl border border-white/10 p-4"
  >
    {editingRequirementId === requirement.id ? (
      <form onSubmit={saveRequirementEdit} className="space-y-3">
        <div>
          <label
            htmlFor="edit-requirement-title"
            className="mb-1 block text-sm font-medium"
          >
            Título
          </label>
          <input
            id="edit-requirement-title"
            value={editRequirementTitle}
            onChange={(event) =>
              setEditRequirementTitle(event.target.value)
            }
            maxLength={120}
            required
            className="w-full min-w-0 rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="edit-requirement-description"
            className="mb-1 block text-sm font-medium"
          >
            Descrição
          </label>
          <textarea
            id="edit-requirement-description"
            value={editRequirementDescription}
            onChange={(event) =>
              setEditRequirementDescription(event.target.value)
            }
            maxLength={2000}
            rows={3}
            className="w-full min-w-0 resize-y rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="edit-requirement-priority"
            className="mb-1 block text-sm font-medium"
          >
            Prioridade
          </label>
          <select
            id="edit-requirement-priority"
            value={editRequirementPriority}
            onChange={(event) =>
              setEditRequirementPriority(event.target.value)
            }
            className="w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100"
          >
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
          </select>
        </div>

        {editingRequirementError && (
          <p role="alert" className="text-sm text-red-400">
            {editingRequirementError}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingRequirementId(null);
              setEditingRequirementError("");
            }}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={savingRequirementEdit || !editRequirementTitle.trim()}
            className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {savingRequirementEdit ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    ) : (
      <>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="text-sm font-medium">
            {requirement.title}
          </h4>

          <span className="rounded-full bg-indigo-400/10 px-3 py-1 text-xs text-indigo-300">
            {requirement.priority === "HIGH"
              ? "Prioridade alta"
              : requirement.priority === "LOW"
                ? "Prioridade baixa"
                : "Prioridade média"}
          </span>
        </div>

        {requirement.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
            {requirement.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => startEditingRequirement(requirement)}
            className="rounded-lg border border-indigo-400/20 px-3 py-1.5 text-xs text-indigo-300 transition hover:bg-indigo-400/10"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => deleteRequirement(requirement)}
            className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-400/10"
          >
            Excluir requisito
          </button>
        </div>
      </>
    )}
  </div>
))}
    </div>
  )}
</div>
          </div>

              <div className="rounded-2xl border border-white/10 bg-[#11182b] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Arquitetura</h3>
                  <span className="rounded-full bg-indigo-400/10 px-3 py-1 text-xs text-indigo-300">
                    Em preparação
                  </span>
                </div>

                <p className="text-sm leading-6 text-slate-400">
                  Registre as decisões técnicas, as tecnologias, os componentes
                  e as integrações da aplicação.
                </p>

                <div className="mt-5 space-y-4">
  <form
    onSubmit={createArchitectureDecision}
    className="space-y-3 rounded-xl border border-white/10 p-4"
  >
    <div>
      <label
        htmlFor="architecture-title"
        className="mb-1 block text-sm font-medium"
      >
        Título da decisão
      </label>

      <input
        id="architecture-title"
        value={architectureTitle}
        onChange={(event) => setArchitectureTitle(event.target.value)}
        placeholder="Ex.: Utilizar PostgreSQL como banco principal"
        maxLength={120}
        required
        className="w-full min-w-0 rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>

    <div>
      <label
        htmlFor="architecture-description"
        className="mb-1 block text-sm font-medium"
      >
        Justificativa e detalhes técnicos
      </label>

      <textarea
        id="architecture-description"
        value={architectureDescription}
        onChange={(event) =>
          setArchitectureDescription(event.target.value)
        }
        placeholder="Descreva a decisão, os motivos e os impactos esperados..."
        maxLength={2000}
        rows={3}
        className="w-full min-w-0 resize-y rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <label
          htmlFor="architecture-category"
          className="mb-1 block text-sm font-medium"
        >
          Categoria
        </label>

        <select
          id="architecture-category"
          value={architectureCategory}
          onChange={(event) =>
            setArchitectureCategory(event.target.value)
          }
          className="w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="GENERAL">Geral</option>
          <option value="TECHNOLOGY">Tecnologia</option>
          <option value="DATABASE">Banco de dados</option>
          <option value="SECURITY">Segurança</option>
          <option value="INTEGRATION">Integrações</option>
          <option value="INFRASTRUCTURE">Infraestrutura</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={!architectureTitle.trim()}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Salvar decisão
      </button>
    </div>

    {architectureError && (
      <p role="alert" className="text-sm text-red-400">
        {architectureError}
      </p>
    )}

    {architectureSuccess && (
      <p role="status" className="text-sm text-emerald-400">
        {architectureSuccess}
      </p>
    )}
  </form>

  {architectureLoading ? (
    <p className="text-sm text-slate-400">
      Carregando decisões de arquitetura...
    </p>
  ) : architectureDecisions.length === 0 ? (
    <div className="rounded-xl border border-dashed border-white/10 p-4">
      <p className="text-sm text-slate-400">
        Nenhuma decisão de arquitetura registrada ainda.
      </p>
    </div>
  ) : (
    <div className="space-y-3">
      {architectureDecisions.map((decision) => (
  <div
    key={decision.id}
    className="rounded-xl border border-white/10 p-4"
  >
    {editingArchitectureDecisionId === decision.id ? (
      <form onSubmit={saveArchitectureEdit} className="space-y-3">
        <div>
          <label
            htmlFor="edit-architecture-title"
            className="mb-1 block text-sm font-medium"
          >
            Título da decisão
          </label>

          <input
            id="edit-architecture-title"
            value={editArchitectureTitle}
            onChange={(event) =>
              setEditArchitectureTitle(event.target.value)
            }
            maxLength={120}
            required
            className="w-full min-w-0 rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="edit-architecture-description"
            className="mb-1 block text-sm font-medium"
          >
            Justificativa e detalhes técnicos
          </label>

          <textarea
            id="edit-architecture-description"
            value={editArchitectureDescription}
            onChange={(event) =>
              setEditArchitectureDescription(event.target.value)
            }
            maxLength={2000}
            rows={3}
            className="w-full min-w-0 resize-y rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="edit-architecture-category"
            className="mb-1 block text-sm font-medium"
          >
            Categoria
          </label>

          <select
            id="edit-architecture-category"
            value={editArchitectureCategory}
            onChange={(event) =>
              setEditArchitectureCategory(event.target.value)
            }
            className="w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 py-2 text-sm text-slate-100"
          >
            <option value="GENERAL">Geral</option>
            <option value="TECHNOLOGY">Tecnologia</option>
            <option value="DATABASE">Banco de dados</option>
            <option value="SECURITY">Segurança</option>
            <option value="INTEGRATION">Integrações</option>
            <option value="INFRASTRUCTURE">Infraestrutura</option>
          </select>
        </div>

        {editingArchitectureError && (
          <p role="alert" className="text-sm text-red-400">
            {editingArchitectureError}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingArchitectureDecisionId(null);
              setEditingArchitectureError("");
            }}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={
              savingArchitectureEdit || !editArchitectureTitle.trim()
            }
            className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {savingArchitectureEdit
              ? "Salvando..."
              : "Salvar alterações"}
          </button>
        </div>
      </form>
    ) : (
      <>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="text-sm font-medium">
            {decision.title}
          </h4>

          <span className="rounded-full bg-indigo-400/10 px-3 py-1 text-xs text-indigo-300">
            {{
              GENERAL: "Geral",
              TECHNOLOGY: "Tecnologia",
              DATABASE: "Banco de dados",
              SECURITY: "Segurança",
              INTEGRATION: "Integrações",
              INFRASTRUCTURE: "Infraestrutura",
            }[decision.category] || decision.category}
          </span>
        </div>

        {decision.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
            {decision.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              startEditingArchitectureDecision(decision)
            }
            className="rounded-lg border border-indigo-400/20 px-3 py-1.5 text-xs text-indigo-300 transition hover:bg-indigo-400/10"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => deleteArchitectureDecision(decision)}
            className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-400/10"
          >
            Excluir decisão
          </button>
        </div>
      </>
    )}
  </div>
))}
    </div>
  )}
</div>
              </div>
      </div>

    <div className="mb-6 rounded-2xl border border-white/10 bg-[#11182b] p-5">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h3 className="font-semibold">Analista de Requisitos</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Gere uma especificação funcional a partir dos requisitos cadastrados.
      </p>
      <p className="mt-1 text-xs text-amber-300">
        Modo demonstrativo — sem chamada a um modelo de IA.
      </p>
    </div>

    <button
      type="button"
      onClick={runRequirementsAnalysis}
      disabled={analysisLoading || requirements.length === 0}
      className="shrink-0 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {analysisLoading ? "Analisando..." : "Executar análise"}
    </button>
  </div>

  {requirements.length === 0 && (
    <p className="mt-3 text-sm text-slate-400">
      Cadastre pelo menos um requisito para executar a análise.
    </p>
  )}

  {analysisError && (
    <p role="alert" className="mt-4 text-sm text-red-400">
      {analysisError}
    </p>
  )}

  {analysisRunId && (
    <p className="mt-4 text-xs text-slate-400">
      Execução registrada: {analysisRunId}
    </p>
  )}

  {analysisOutput && (
    <div className="mt-5 border-t border-white/10 pt-5">
      <h4 className="mb-3 font-semibold">Especificação funcional gerada</h4>

      <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-[#0b1020] p-4 text-sm leading-6 text-slate-300">
        {analysisOutput}
      </pre>
    </div>
  )}
</div>  

    <div className="rounded-2xl border border-white/10 bg-[#11182b] p-5">
      <h3 className="font-semibold">Etapa atual do projeto</h3>
      <p className="mt-2 text-sm text-slate-400">
        O projeto está na etapa de {selectedProject.stage}.
      </p>
    </div>
  </div>
)}

          {page === "Biblioteca de prompts" && (
            <>
              <SectionTitle
                title="Biblioteca de prompts"
                description="Prompts reutilizáveis para cada especialidade e etapa do desenvolvimento."
              />
              <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome, categoria ou descrição..."
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#11182b] px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-indigo-400/60"
                />
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="rounded-xl border border-white/10 bg-[#11182b] px-4 py-3 text-sm text-slate-200 outline-none"
                >
                  <option>Todas</option>
                  {Array.from(new Set(prompts.map((p) => p.category))).map(
                    (item) => (
                      <option key={item}>{item}</option>
                    ),
                  )}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredPrompts.map((prompt) => (
                  <article
                    key={prompt.title}
                    className="rounded-2xl border border-white/10 bg-[#11182b] p-5"
                  >
                    <span className="rounded-lg bg-indigo-400/10 px-2.5 py-1.5 text-xs text-indigo-300">
                      {prompt.category}
                    </span>
                    <h4 className="mt-5 font-semibold">{prompt.title}</h4>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
                      {prompt.description}
                    </p>
                    <button
                      onClick={() => copyPrompt(prompt)}
                      className="mt-5 w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm transition hover:border-indigo-400/40 hover:bg-indigo-400/5"
                    >
                      {copiedPrompt === prompt.title
                        ? "✓ Prompt copiado"
                        : "Copiar prompt"}
                    </button>
                  </article>
                ))}
                {filteredPrompts.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Nenhum prompt encontrado. Tente outro termo.
                  </p>
                )}
              </div>
            </>
          )}

          {page === "Agentes de IA" && (
            <>
              <SectionTitle
                title="Agentes especializados"
                description="Cada agente terá um papel, instruções, entradas, saídas e critérios de validação."
              />
              <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/[.05] p-4 text-sm leading-6 text-amber-200/90">
                Os agentes abaixo são definições iniciais. Ainda não estão
                conectados a um modelo de IA nem executam tarefas autonomamente.
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[
                  ["◉", "Product Manager", "Descobre necessidades e define requisitos."],
                  ["⌘", "Arquiteto de Software", "Desenha a solução técnica e as integrações."],
                  ["</>", "Desenvolvedor", "Implementa funcionalidades a partir do plano aprovado."],
                  ["✓", "QA Engineer", "Cria testes e verifica os critérios de aceite."],
                  ["⬡", "Security Auditor", "Inspeciona riscos e controles de segurança."],
                  ["▤", "Documentador", "Gera documentação técnica e operacional."],
                ].map(([icon, title, description]) => (
                  <article
                    key={title}
                    className="rounded-2xl border border-white/10 bg-[#11182b] p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-400/10 text-lg text-indigo-300">
                        {icon}
                      </span>
                      <span className="rounded-full bg-slate-400/10 px-2.5 py-1 text-[10px] text-slate-400">
                        Planejado
                      </span>
                    </div>
                    <h4 className="mt-5 font-semibold">{title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {description}
                    </p>
                  </article>
                ))}
              </div>
            </>
          )}

          {page === "Fluxos de trabalho" && (
            <>
              <SectionTitle
                title="Fluxos de trabalho"
                description="Organize o processo em etapas explícitas com aprovações antes de avançar."
              />
              <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stages.map((stage) => (
                  <button
                    key={stage.key}
                    onClick={() => setSelectedStage(stage.key)}
                    className={`rounded-2xl border p-4 text-left ${
                      selectedStage === stage.key
                        ? "border-indigo-400/50 bg-indigo-400/10"
                        : "border-white/10 bg-[#11182b]"
                    }`}
                  >
                    <p className="text-xs text-indigo-300">{stage.number}</p>
                    <h4 className="mt-3 font-medium">{stage.title}</h4>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      {stage.description}
                    </p>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#11182b] p-6">
                <p className="text-xs uppercase tracking-widest text-indigo-300">
                  Etapa selecionada
                </p>
                <h4 className="mt-3 text-2xl font-semibold">
                  {stages.find((stage) => stage.key === selectedStage)?.title}
                </h4>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {stages.find((stage) => stage.key === selectedStage)?.description}
                </p>
                <div className="mt-6 rounded-xl border border-white/10 p-4 text-sm leading-6 text-slate-300">
                  Status: aguardando configuração do orquestrador.
                  <br />
                  Aprovação humana: necessária antes de avançar para a próxima
                  etapa.
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <form
            onSubmit={createProject}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#11182b] p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Novo projeto</h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg px-3 py-1 text-slate-400 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <label className="mb-2 block text-sm text-slate-300">
              Nome do projeto *
            </label>
            <input
              required
              autoFocus
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Ex.: Plataforma de atendimento com IA"
              className="mb-5 w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm outline-none focus:border-indigo-400/60"
            />
            <label className="mb-2 block text-sm text-slate-300">
              Descrição
            </label>
            <textarea
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
              placeholder="Descreva brevemente a ideia e o objetivo..."
              rows={4}
              className="mb-6 w-full resize-y rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm outline-none focus:border-indigo-400/60"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-400"
              >
                Criar projeto
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7">
      <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function ProjectList({
  projects,
  onView,
  onSelectProject,
  showAction = false,
}: {
  projects: Project[];
  onView: () => void;
  onSelectProject: (project: Project) => void;
  showAction?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#11182b] p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold">Projetos recentes</h4>
          <p className="mt-1 text-xs text-slate-400">
            Acompanhe suas aplicações em desenvolvimento
          </p>
        </div>
        <button
          onClick={onView}
          className="text-sm text-indigo-300 hover:text-indigo-200"
        >
          {showAction ? "+ Criar projeto" : "Ver todos →"}
        </button>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <div
            key={project.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectProject(project)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectProject(project);
              }
            }}
            className="cursor-pointer rounded-xl border border-white/[.07] p-4 transition hover:border-indigo-400/40 hover:bg-white/[.02] focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h5 className="text-sm font-medium">{project.name}</h5>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {project.description}
                </p>
              </div>
              <span className="rounded-full bg-indigo-400/10 px-3 py-1.5 text-xs text-indigo-300">
                {project.stage}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-indigo-400 transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs text-slate-400">
                {project.progress}%
              </span>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhum projeto cadastrado.
          </p>
        )}
      </div>
    </div>
  );
}
