import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
} from "@tanstack/react-router";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

import { cn } from "@/lib/utils";

import {
  createConversation,
  deleteConversation,
  insertMessage,
  listConversations,
  listMessages,
  updateConversation,
  type AiConversation,
  type AiMessage,
} from "@/lib/ai-data";

import { streamChat } from "@/lib/ai-stream";

import {
  capabilityForRoute,
} from "@/lib/capability-matrix";

import {
  getModule,
} from "@/lib/modules";

import {
  specialistFor,
  type Specialist,
} from "@/lib/specialists";

import {
  createGrowthCoordinationMission,
  createRevenueIntelligenceMission,
  createStoreOperationsMission,
  createTechDeliveryMission,
  type CoordinationMissionResult,
} from "@/lib/workforce-data";

import {
  workspaceRuntimeStatus,
} from "@/lib/workspace-runtime";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface Props {
  to: string;
}

type WorkforceMissionKind =
  | "growth"
  | "store"
  | "tech"
  | "revenue";

interface WorkforceMissionDefinition {
  kind: WorkforceMissionKind;

  label: string;

  description: string;

  employeeKeys: ReadonlySet<string>;
}

interface CreatedMissionState {
  kind: WorkforceMissionKind;

  result: CoordinationMissionResult;
}

/* -------------------------------------------------------------------------- */
/* WORKFORCE MISSION DEFINITIONS                                              */
/* -------------------------------------------------------------------------- */

/**
 * These sets mirror the real workforce engines in workforce-data.ts.
 *
 * They are used only to determine which workforce engine best matches an
 * owner-facing specialist.
 *
 * They do not prove that the employee exists or is active.
 * workforce-data.ts remains the execution/source-of-truth layer.
 */

const GROWTH_WORKFORCE_KEYS =
  new Set<string>([
    "website-seo-monitor",
    "social-strategy-planner",
    "content-writer",
    "creative-media-producer",
    "social-schedule-coordinator",
    "social-media-manager",
    "account-growth-analyst",
    "paid-media-specialist",
    "ai-ceo",
  ]);

const STORE_WORKFORCE_KEYS =
  new Set<string>([
    "product-intelligence-analyst",
    "supplier-sourcing-analyst",
    "store-operations-manager",
    "content-writer",
    "creative-media-producer",
    "social-media-manager",
    "account-growth-analyst",
    "ai-ceo",
  ]);

const TECH_WORKFORCE_KEYS =
  new Set<string>([
    "tech-solutions-specialist",
    "website-delivery-specialist",
    "content-writer",
    "creative-media-producer",
    "website-seo-monitor",
    "ai-ceo",
  ]);

const REVENUE_WORKFORCE_KEYS =
  new Set<string>([
    "lead-intake-coordinator",
    "customer-reactivation-analyst",
    "broker-deal-intelligence-analyst",
    "procurement-intelligence-analyst",
    "ai-ceo",
  ]);

const WORKFORCE_MISSIONS:
  readonly WorkforceMissionDefinition[] =
  [
    {
      kind:
        "growth",

      label:
        "Growth workforce",

      description:
        "Website intelligence → social strategy → content → creative → scheduling → social management → growth analysis → paid media → AI CEO.",

      employeeKeys:
        GROWTH_WORKFORCE_KEYS,
    },

    {
      kind:
        "store",

      label:
        "Cossa Store workforce",

      description:
        "Product intelligence → supplier sourcing → store operations → content → creative → social commerce → growth analysis → AI CEO.",

      employeeKeys:
        STORE_WORKFORCE_KEYS,
    },

    {
      kind:
        "tech",

      label:
        "Cossa Tech workforce",

      description:
        "Technical solution → website delivery → content → creative → SEO and quality review → AI CEO.",

      employeeKeys:
        TECH_WORKFORCE_KEYS,
    },

    {
      kind:
        "revenue",

      label:
        "Revenue workforce",

      description:
        "Lead intake → customer reactivation → commercial intelligence → procurement intelligence → AI CEO.",

      employeeKeys:
        REVENUE_WORKFORCE_KEYS,
    },
  ];

/* -------------------------------------------------------------------------- */
/* GENERIC HELPERS                                                            */
/* -------------------------------------------------------------------------- */

function normaliseErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error ===
    "string"
  ) {
    return error;
  }

  return "Unknown Cossa AI error.";
}

function workflowDefinitionForKind(
  kind: WorkforceMissionKind,
): WorkforceMissionDefinition {
  const definition =
    WORKFORCE_MISSIONS.find(
      (
        candidate,
      ) =>
        candidate.kind ===
        kind,
    );

  if (!definition) {
    throw new Error(
      `Unsupported workforce mission type: ${kind}`,
    );
  }

  return definition;
}

/* -------------------------------------------------------------------------- */
/* SPECIALIST → WORKFORCE RESOLUTION                                          */
/* -------------------------------------------------------------------------- */

/**
 * Determine which real workforce engine most closely matches the specialist.
 *
 * We score each workflow by the number of employee keys shared with the
 * specialist.
 *
 * Example:
 *
 * /marketing/social
 *
 * specialist workforce keys:
 * 9 Growth employees
 *
 * scores:
 * Growth  = 9
 * Store   = a few shared employees
 * Tech    = a few shared employees
 * Revenue = AI CEO only
 *
 * Result:
 * Growth only.
 *
 * For broad executive specialists such as AI CEO, several workflows may tie.
 * The UI then allows the owner to explicitly select the desired workflow.
 */
function missionKindsForSpecialist(
  specialist:
    Specialist |
    undefined,
): WorkforceMissionKind[] {
  if (
    !specialist ||
    !specialist.canCreateMission
  ) {
    return [];
  }

  const employeeKeys =
    specialist.workforceEmployeeKeys ??
    [];

  if (
    employeeKeys.length ===
    0
  ) {
    return [];
  }

  const scores =
    WORKFORCE_MISSIONS.map(
      (
        definition,
      ) => {
        const score =
          employeeKeys.reduce(
            (
              total,
              employeeKey,
            ) =>
              total +
              (
                definition.employeeKeys.has(
                  employeeKey,
                )
                  ? 1
                  : 0
              ),
            0,
          );

        return {
          kind:
            definition.kind,

          score,
        };
      },
    );

  const highestScore =
    Math.max(
      ...scores.map(
        (
          item,
        ) =>
          item.score,
      ),
    );

  if (
    highestScore <=
    0
  ) {
    return [];
  }

  return scores
    .filter(
      (
        item,
      ) =>
        item.score ===
        highestScore,
    )
    .map(
      (
        item,
      ) =>
        item.kind,
    );
}

/* -------------------------------------------------------------------------- */
/* REAL WORKFORCE CREATION                                                    */
/* -------------------------------------------------------------------------- */

async function createWorkforceMission({
  kind,
  objective,
  targetMarket,
  targetLocation,
}: {
  kind:
    WorkforceMissionKind;

  objective:
    string;

  targetMarket:
    string;

  targetLocation:
    string;
}): Promise<CoordinationMissionResult> {
  const cleanObjective =
    objective.trim();

  if (
    !cleanObjective
  ) {
    throw new Error(
      "A workforce mission objective is required.",
    );
  }

  const commonInput = {
    objective:
      cleanObjective,

    target_market:
      targetMarket.trim() ||
      null,

    target_location:
      targetLocation.trim() ||
      null,
  };

  switch (
    kind
  ) {
    case "growth":
      return createGrowthCoordinationMission(
        commonInput,
      );

    case "store":
      return createStoreOperationsMission(
        commonInput,
      );

    case "tech":
      return createTechDeliveryMission(
        commonInput,
      );

    case "revenue":
      return createRevenueIntelligenceMission(
        commonInput,
      );

    default: {
      const exhaustiveCheck:
        never =
        kind;

      throw new Error(
        `Unsupported workforce mission type: ${String(
          exhaustiveCheck,
        )}`,
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* SPECIALIST CHAT                                                            */
/* -------------------------------------------------------------------------- */

export function SpecialistChat({
  to,
}: Props) {
  const mod =
    getModule(
      to,
    );

  const spec =
    specialistFor(
      to,
    );

  const Icon:
    LucideIcon =
    mod?.icon ??
    Bot;

  const category =
    `specialist:${to}`;

  const qc =
    useQueryClient();

  /* ------------------------------------------------------------------------ */
  /* CHAT STATE                                                               */
  /* ------------------------------------------------------------------------ */

  const [
    activeId,
    setActiveId,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const [
    input,
    setInput,
  ] =
    useState(
      "",
    );

  const [
    streaming,
    setStreaming,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  const [
    sending,
    setSending,
  ] =
    useState(
      false,
    );

  /* ------------------------------------------------------------------------ */
  /* WORKFORCE BRIDGE STATE                                                   */
  /* ------------------------------------------------------------------------ */

  const [
    missionPanelOpen,
    setMissionPanelOpen,
  ] =
    useState(
      false,
    );

  const [
    missionObjective,
    setMissionObjective,
  ] =
    useState(
      "",
    );

  const [
    missionTargetMarket,
    setMissionTargetMarket,
  ] =
    useState(
      "South Africa",
    );

  const [
    missionTargetLocation,
    setMissionTargetLocation,
  ] =
    useState(
      "Gauteng",
    );

  const [
    selectedMissionKind,
    setSelectedMissionKind,
  ] =
    useState<
      WorkforceMissionKind |
      null
    >(
      null,
    );

  const [
    lastCreatedMission,
    setLastCreatedMission,
  ] =
    useState<
      CreatedMissionState |
      null
    >(
      null,
    );

  /* ------------------------------------------------------------------------ */
  /* REFS                                                                     */
  /* ------------------------------------------------------------------------ */

  const scrollRef =
    useRef<
      HTMLDivElement |
      null
    >(
      null,
    );

  const abortRef =
    useRef<
      AbortController |
      null
    >(
      null,
    );

  /* ------------------------------------------------------------------------ */
  /* QUERIES                                                                  */
  /* ------------------------------------------------------------------------ */

  const convos =
    useQuery({
      queryKey: [
        "ai-conversations",
        category,
      ],

      queryFn:
        () =>
          listConversations(
            category,
          ),
    });

  const messages =
    useQuery({
      queryKey: [
        "ai-messages",
        activeId,
      ],

      queryFn:
        () =>
          activeId
            ? listMessages(
                activeId,
              )
            : Promise.resolve(
                [] as AiMessage[],
              ),

      enabled:
        Boolean(
          activeId,
        ),
    });

  /* ------------------------------------------------------------------------ */
  /* SPECIALIST WORKFORCE CAPABILITY                                          */
  /* ------------------------------------------------------------------------ */

  const availableMissionKinds =
    useMemo(
      () =>
        missionKindsForSpecialist(
          spec,
        ),
      [
        spec,
      ],
    );

  const missionBridgeEnabled =
    Boolean(
      spec?.canCreateMission &&
      availableMissionKinds.length >
        0,
    );

  const selectedMissionDefinition =
    selectedMissionKind
      ? workflowDefinitionForKind(
          selectedMissionKind,
        )
      : null;

  /* ------------------------------------------------------------------------ */
  /* EFFECTS                                                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(
    () => {
      if (
        !activeId &&
        convos.data &&
        convos.data.length >
          0
      ) {
        setActiveId(
          convos.data[0].id,
        );
      }
    },
    [
      convos.data,
      activeId,
    ],
  );

  useEffect(
    () => {
      scrollRef.current?.scrollTo({
        top:
          scrollRef.current.scrollHeight,

        behavior:
          "smooth",
      });
    },
    [
      messages.data,
      streaming,
    ],
  );

  /**
   * Keep mission selection valid when moving between specialist routes.
   */
  useEffect(
    () => {
      if (
        availableMissionKinds.length ===
        0
      ) {
        setSelectedMissionKind(
          null,
        );

        setMissionPanelOpen(
          false,
        );

        return;
      }

      if (
        !selectedMissionKind ||
        !availableMissionKinds.includes(
          selectedMissionKind,
        )
      ) {
        setSelectedMissionKind(
          availableMissionKinds[0],
        );
      }
    },
    [
      availableMissionKinds,
      selectedMissionKind,
    ],
  );

  /**
   * Do not carry a completed mission banner into a different specialist route.
   */
  useEffect(
    () => {
      setLastCreatedMission(
        null,
      );
    },
    [
      to,
    ],
  );

  /* ------------------------------------------------------------------------ */
  /* FILTERED CONVERSATIONS                                                   */
  /* ------------------------------------------------------------------------ */

  const filtered =
    useMemo(
      () => {
        const q =
          search
            .trim()
            .toLowerCase();

        if (!q) {
          return (
            convos.data ??
            []
          );
        }

        return (
          convos.data ??
          []
        ).filter(
          (
            conversation,
          ) =>
            conversation.title
              .toLowerCase()
              .includes(
                q,
              ),
        );
      },
      [
        convos.data,
        search,
      ],
    );

  /* ------------------------------------------------------------------------ */
  /* DERIVED CHAT DATA                                                        */
  /* ------------------------------------------------------------------------ */

  const activeConvo =
    (
      convos.data ??
      []
    ).find(
      (
        conversation,
      ) =>
        conversation.id ===
        activeId,
    ) ??
    null;

  const latestUserMessage =
    [
      ...(
        messages.data ??
        []
      ),
    ]
      .reverse()
      .find(
        (
          message,
        ) =>
          message.role ===
          "user",
      );

  const hasMessages =
    (
      messages.data?.length ??
      0
    ) >
      0 ||
    streaming !==
      null;

  const title =
    mod?.title ??
    spec?.title ??
    "Specialist";

  const starters =
    spec?.starters ??
    [];

  const capability =
    capabilityForRoute(
      to,
    );

  /* ------------------------------------------------------------------------ */
  /* NEW CONVERSATION                                                         */
  /* ------------------------------------------------------------------------ */

  async function handleNew() {
    try {
      const conversation =
        await createConversation(
          "New conversation",
          category,
        );

      await qc.invalidateQueries({
        queryKey: [
          "ai-conversations",
          category,
        ],
      });

      setActiveId(
        conversation.id,
      );
    } catch (
      error
    ) {
      toast.error(
        "Could not start a new chat",
        {
          description:
            normaliseErrorMessage(
              error,
            ),
        },
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* DELETE CONVERSATION                                                      */
  /* ------------------------------------------------------------------------ */

  async function handleDelete(
    id:
      string,
  ) {
    if (
      !window.confirm(
        "Delete this conversation?",
      )
    ) {
      return;
    }

    try {
      await deleteConversation(
        id,
      );

      await qc.invalidateQueries({
        queryKey: [
          "ai-conversations",
          category,
        ],
      });

      if (
        id ===
        activeId
      ) {
        setActiveId(
          null,
        );
      }
    } catch (
      error
    ) {
      toast.error(
        "Delete failed",
        {
          description:
            normaliseErrorMessage(
              error,
            ),
        },
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* PIN                                                                      */
  /* ------------------------------------------------------------------------ */

  async function handleTogglePin(
    conversation:
      AiConversation,
  ) {
    try {
      await updateConversation(
        conversation.id,
        {
          pinned:
            !conversation.pinned,
        },
      );

      await qc.invalidateQueries({
        queryKey: [
          "ai-conversations",
          category,
        ],
      });
    } catch (
      error
    ) {
      toast.error(
        "Could not update",
        {
          description:
            normaliseErrorMessage(
              error,
            ),
        },
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* SEND CHAT                                                                */
  /* ------------------------------------------------------------------------ */

  async function handleSend(
    text?:
      string,
  ) {
    const content =
      (
        text ??
        input
      ).trim();

    if (
      !content ||
      sending
    ) {
      return;
    }

    setSending(
      true,
    );

    setInput(
      "",
    );

    try {
      let convoId =
        activeId;

      if (
        !convoId
      ) {
        const conversation =
          await createConversation(
            content.slice(
              0,
              60,
            ),
            category,
          );

        convoId =
          conversation.id;

        setActiveId(
          convoId,
        );

        await qc.invalidateQueries({
          queryKey: [
            "ai-conversations",
            category,
          ],
        });
      }

      await insertMessage(
        convoId,
        "user",
        content,
      );

      await qc.invalidateQueries({
        queryKey: [
          "ai-messages",
          convoId,
        ],
      });

      const prior =
        (
          await listMessages(
            convoId,
          )
        ).map(
          (
            message,
          ) => ({
            role:
              message.role,

            content:
              message.content,
          }),
        );

      const currentConvo =
        (
          convos.data ??
          []
        ).find(
          (
            conversation,
          ) =>
            conversation.id ===
            convoId,
        );

      if (
        currentConvo &&
        (
          currentConvo.title ===
            "New conversation" ||
          !currentConvo.title.trim()
        )
      ) {
        await updateConversation(
          convoId,
          {
            title:
              content.slice(
                0,
                60,
              ),
          },
        );

        await qc.invalidateQueries({
          queryKey: [
            "ai-conversations",
            category,
          ],
        });
      }

      abortRef.current =
        new AbortController();

      setStreaming(
        "",
      );

      const final =
        await streamChat(
          prior,

          (
            chunk,
          ) =>
            setStreaming(
              (
                current,
              ) =>
                (
                  current ??
                  ""
                ) +
                chunk,
            ),

          abortRef.current.signal,

          spec?.system,
        );

      await insertMessage(
        convoId,
        "assistant",
        final,
      );

      setStreaming(
        null,
      );

      await qc.invalidateQueries({
        queryKey: [
          "ai-messages",
          convoId,
        ],
      });

      await qc.invalidateQueries({
        queryKey: [
          "ai-conversations",
          category,
        ],
      });
    } catch (
      error
    ) {
      setStreaming(
        null,
      );

      const message =
        normaliseErrorMessage(
          error,
        );

      if (
        message.includes(
          "402",
        )
      ) {
        toast.error(
          "AI service unavailable",
          {
            description:
              "The inference service needs attention. Please try again later.",
          },
        );
      } else if (
        message.includes(
          "429",
        )
      ) {
        toast.error(
          "Rate limited",
          {
            description:
              "Please try again in a moment.",
          },
        );
      } else {
        toast.error(
          "AI request failed",
          {
            description:
              message,
          },
        );
      }
    } finally {
      setSending(
        false,
      );

      abortRef.current =
        null;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* OPEN WORKFORCE MISSION PANEL                                             */
  /* ------------------------------------------------------------------------ */

  function handleOpenMissionPanel() {
    if (
      !missionBridgeEnabled
    ) {
      toast.error(
        "Workforce bridge unavailable",
        {
          description:
            "This specialist is not currently mapped to a real Cossa workforce mission engine.",
        },
      );

      return;
    }

    if (
      !missionObjective.trim()
    ) {
      const suggestedObjective =
        input.trim() ||
        latestUserMessage?.content.trim() ||
        (
          activeConvo?.title &&
          activeConvo.title !==
            "New conversation"
            ? activeConvo.title
            : ""
        ) ||
        `Complete a coordinated ${title} mission using verified Cossa information.`;

      setMissionObjective(
        suggestedObjective,
      );
    }

    setMissionPanelOpen(
      true,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* CREATE REAL WORKFORCE MISSION                                            */
  /* ------------------------------------------------------------------------ */

  const createMissionMutation =
    useMutation({
      mutationFn:
        async () => {
          if (
            !spec
          ) {
            throw new Error(
              "The specialist configuration could not be loaded.",
            );
          }

          if (
            !spec.canCreateMission
          ) {
            throw new Error(
              `${spec.title} is advisory-only and cannot create a workforce mission.`,
            );
          }

          if (
            !selectedMissionKind
          ) {
            throw new Error(
              "Select a workforce mission type.",
            );
          }

          if (
            !availableMissionKinds.includes(
              selectedMissionKind,
            )
          ) {
            throw new Error(
              "The selected workforce mission is not authorised for this specialist mapping.",
            );
          }

          const result =
            await createWorkforceMission({
              kind:
                selectedMissionKind,

              objective:
                missionObjective,

              targetMarket:
                missionTargetMarket,

              targetLocation:
                missionTargetLocation,
            });

          return {
            kind:
              selectedMissionKind,

            result,
          } satisfies CreatedMissionState;
        },

      onSuccess:
        async (
          created,
        ) => {
          setLastCreatedMission(
            created,
          );

          /**
           * These are the same query keys used by /ai/workforce.
           *
           * Invalidating them means an already-mounted workforce page or later
           * navigation receives the new mission, handoffs and employee state.
           */
          await Promise.all([
            qc.invalidateQueries({
              queryKey: [
                "ai-workforce-employees",
              ],
            }),

            qc.invalidateQueries({
              queryKey: [
                "ai-workforce-missions",
              ],
            }),

            qc.invalidateQueries({
              queryKey: [
                "ai-workforce-handoffs",
              ],
            }),

            qc.invalidateQueries({
              queryKey: [
                "ai-workforce-runs",
              ],
            }),

            qc.invalidateQueries({
              queryKey: [
                "ai-workforce-approvals",
              ],
            }),
          ]);

          const definition =
            workflowDefinitionForKind(
              created.kind,
            );

          toast.success(
            "Real workforce mission created",
            {
              description:
                `${definition.label}: ${created.result.handoffs.length} recorded handoff stages were created. No external action was executed.`,
            },
          );
        },

      onError:
        (
          error,
        ) => {
          toast.error(
            "Workforce mission could not be created",
            {
              description:
                normaliseErrorMessage(
                  error,
                ),
            },
          );
        },
    });

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-[1600px] flex-col gap-4">
      {/* -------------------------------------------------------------------- */}
      {/* SPECIALIST HEADER                                                    */}
      {/* -------------------------------------------------------------------- */}

      <section className="glass-card relative overflow-hidden p-5 md:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary gold-glow">
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-semibold md:text-2xl">
                  {title}
                </h1>

                <StatusBadge
                  status={
                    workspaceRuntimeStatus()
                  }
                />

                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {
                    capability.label
                  }
                </span>

                {missionBridgeEnabled ? (
                  <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                    Workforce connected
                  </span>
                ) : spec?.canCreateMission ? (
                  <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                    Mission bridge not mapped
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                {
                  capability.summary
                }
              </p>

              <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
                {
                  capability.evidence
                }
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {missionBridgeEnabled ? (
              <Button
                type="button"
                variant="outline"
                onClick={
                  handleOpenMissionPanel
                }
                className="w-full border-primary/40 text-primary hover:bg-primary/10 sm:w-auto"
              >
                <Workflow className="mr-1.5 h-4 w-4" />

                Create workforce mission
              </Button>
            ) : null}

            <Button
              type="button"
              onClick={
                handleNew
              }
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow sm:w-auto"
            >
              <Plus className="mr-1.5 h-4 w-4" />

              New chat
            </Button>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* REAL WORKFORCE MISSION CREATOR                                       */}
      {/* -------------------------------------------------------------------- */}

      {missionPanelOpen &&
      missionBridgeEnabled ? (
        <section className="glass-card border border-primary/20 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-primary" />

                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  Real workforce bridge
                </p>
              </div>

              <h2 className="mt-1 font-display text-xl font-semibold">
                Create a recorded Cossa workforce mission
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                This action creates a real mission and real employee handoffs
                in the Cossa workforce database. It does not claim that the
                employees have executed the mission and it does not publish,
                message, spend money or perform another external action.
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setMissionPanelOpen(
                  false,
                )
              }
              aria-label="Close workforce mission creator"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-4">
              {availableMissionKinds.length >
              1 ? (
                <label className="grid gap-1.5 text-sm font-medium">
                  Workforce type

                  <select
                    value={
                      selectedMissionKind ??
                      ""
                    }
                    onChange={(
                      event,
                    ) =>
                      setSelectedMissionKind(
                        event.target
                          .value as WorkforceMissionKind,
                      )
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
                  >
                    {availableMissionKinds.map(
                      (
                        kind,
                      ) => {
                        const definition =
                          workflowDefinitionForKind(
                            kind,
                          );

                        return (
                          <option
                            key={
                              kind
                            }
                            value={
                              kind
                            }
                          >
                            {
                              definition.label
                            }
                          </option>
                        );
                      },
                    )}
                  </select>
                </label>
              ) : null}

              <label className="grid gap-1.5 text-sm font-medium">
                Mission objective

                <textarea
                  value={
                    missionObjective
                  }
                  onChange={(
                    event,
                  ) =>
                    setMissionObjective(
                      event.target.value,
                    )
                  }
                  rows={
                    5
                  }
                  placeholder="Describe the actual outcome the workforce should prepare."
                  className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium">
                  Target market

                  <input
                    value={
                      missionTargetMarket
                    }
                    onChange={(
                      event,
                    ) =>
                      setMissionTargetMarket(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-medium">
                  Target location

                  <input
                    value={
                      missionTargetLocation
                    }
                    onChange={(
                      event,
                    ) =>
                      setMissionTargetLocation(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary/50"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Selected workforce
              </p>

              <h3 className="mt-1 text-sm font-semibold">
                {selectedMissionDefinition?.label ??
                  "No workforce selected"}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {selectedMissionDefinition?.description ??
                  "Select a supported workforce mission."}
              </p>

              <div className="mt-4 rounded-lg border border-success/20 bg-success/5 p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    The workforce backend will install or synchronise required
                    source employees, create the mission and create its
                    hand-to-hand employee assignments.
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-border/60 bg-background/30 p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Execution truth
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Mission creation proves assignment only. Execution is proven
                  later by mission runs and completed handoffs.
                </p>
              </div>

              <Button
                type="button"
                onClick={() =>
                  createMissionMutation.mutate()
                }
                disabled={
                  createMissionMutation.isPending ||
                  !selectedMissionKind ||
                  !missionObjective.trim()
                }
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
              >
                {createMissionMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Workflow className="mr-1.5 h-4 w-4" />
                )}

                {createMissionMutation.isPending
                  ? "Creating real mission…"
                  : "Create workforce mission"}
              </Button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* CREATED MISSION CONFIRMATION                                     */}
          {/* ---------------------------------------------------------------- */}

          {lastCreatedMission ? (
            <div className="mt-5 rounded-xl border border-success/30 bg-success/5 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />

                    <p className="text-xs font-semibold text-success">
                      Workforce mission recorded successfully
                    </p>
                  </div>

                  <p className="mt-2 break-words text-sm font-medium">
                    {
                      lastCreatedMission.result.mission.title
                    }
                  </p>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      Mission ID:{" "}
                      <strong className="text-foreground">
                        {
                          lastCreatedMission.result.mission.id
                        }
                      </strong>
                    </span>

                    <span>
                      Status:{" "}
                      <strong className="text-foreground">
                        {
                          lastCreatedMission.result.mission.status
                        }
                      </strong>
                    </span>

                    <span>
                      Handoffs:{" "}
                      <strong className="text-foreground">
                        {
                          lastCreatedMission.result.handoffs.length
                        }
                      </strong>
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    The mission and employee assignments now exist in the
                    workforce database. Open the Workforce command centre to
                    inspect or run the recorded stages.
                  </p>
                </div>

                <Button
                  asChild
                  className="w-full shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 md:w-auto"
                >
                  <Link
                    to="/ai/workforce"
                  >
                    Open workforce

                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* -------------------------------------------------------------------- */}
      {/* CHAT WORKSPACE                                                       */}
      {/* -------------------------------------------------------------------- */}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* ------------------------------------------------------------------ */}
        {/* CONVERSATION SIDEBAR                                               */}
        {/* ------------------------------------------------------------------ */}

        <aside className="glass-card flex min-h-0 flex-col p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

            <input
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search chats"
              className="w-full rounded-lg border border-border/60 bg-background/50 py-2 pl-8 pr-2 text-xs outline-none focus:border-primary/50"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {convos.isLoading ? (
              <div className="p-3 text-xs text-muted-foreground">
                Loading…
              </div>
            ) : filtered.length ===
              0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                No chats yet. Start one to see it here.
              </div>
            ) : (
              <ul className="space-y-1">
                {filtered.map(
                  (
                    conversation,
                  ) => (
                    <li
                      key={
                        conversation.id
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveId(
                            conversation.id,
                          )
                        }
                        className={cn(
                          "group flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors",

                          conversation.id ===
                            activeId
                            ? "border-primary/40 bg-primary/10"
                            : "border-transparent hover:border-border/60 hover:bg-card/40",
                        )}
                      >
                        <MessageSquare
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",

                            conversation.pinned
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        />

                        <span className="min-w-0 flex-1 truncate">
                          {
                            conversation.title
                          }
                        </span>

                        <span
                          role="button"
                          tabIndex={
                            0
                          }
                          onClick={(
                            event,
                          ) => {
                            event.stopPropagation();

                            void handleTogglePin(
                              conversation,
                            );
                          }}
                          onKeyDown={(
                            event,
                          ) => {
                            if (
                              event.key ===
                              "Enter"
                            ) {
                              event.stopPropagation();

                              void handleTogglePin(
                                conversation,
                              );
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-primary"
                          aria-label={
                            conversation.pinned
                              ? "Unpin"
                              : "Pin"
                          }
                        >
                          <Pin
                            className={cn(
                              "h-3 w-3",

                              conversation.pinned &&
                                "fill-primary text-primary opacity-100",
                            )}
                          />
                        </span>

                        <span
                          role="button"
                          tabIndex={
                            0
                          }
                          onClick={(
                            event,
                          ) => {
                            event.stopPropagation();

                            void handleDelete(
                              conversation.id,
                            );
                          }}
                          onKeyDown={(
                            event,
                          ) => {
                            if (
                              event.key ===
                              "Enter"
                            ) {
                              event.stopPropagation();

                              void handleDelete(
                                conversation.id,
                              );
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </span>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        </aside>

        {/* ------------------------------------------------------------------ */}
        {/* MAIN CHAT                                                          */}
        {/* ------------------------------------------------------------------ */}

        <section className="glass-card flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {activeConvo?.title ??
                  "New chat"}
              </div>

              <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>
                  {
                    capability.label
                  }
                </span>

                <span>
                  •
                </span>

                <span>
                  Economy Groq route when configured
                </span>

                <span>
                  •
                </span>

                <span>
                  external actions require verified authority
                </span>

                {missionBridgeEnabled ? (
                  <>
                    <span>
                      •
                    </span>

                    <span className="text-success">
                      workforce mission bridge available
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            {lastCreatedMission ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="hidden border-primary/40 text-primary hover:bg-primary/10 sm:flex"
              >
                <Link to="/ai/workforce">
                  Workforce

                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* MESSAGES                                                         */}
          {/* ---------------------------------------------------------------- */}

          <div
            ref={
              scrollRef
            }
            className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8"
          >
            {!hasMessages ? (
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary gold-glow">
                  <Sparkles className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="font-display text-2xl font-semibold">
                    Talk to{" "}

                    <span className="text-gradient-gold">
                      {
                        title
                      }
                    </span>
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {
                      capability.summary
                    }
                  </p>

                  {missionBridgeEnabled ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      This specialist can also create a real recorded Cossa
                      workforce mission when you choose{" "}
                      <strong className="text-foreground">
                        Create workforce mission
                      </strong>
                      .
                    </p>
                  ) : null}
                </div>

                <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {starters.map(
                    (
                      label,
                    ) => (
                      <button
                        type="button"
                        key={
                          label
                        }
                        onClick={() =>
                          void handleSend(
                            label,
                          )
                        }
                        className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                        <span>
                          {
                            label
                          }
                        </span>
                      </button>
                    ),
                  )}
                </div>

                {missionBridgeEnabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      handleOpenMissionPanel
                    }
                    className="border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Workflow className="mr-1.5 h-4 w-4" />

                    Create a real workforce mission
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-6">
                {(
                  messages.data ??
                  []
                ).map(
                  (
                    message,
                  ) => (
                    <ChatBubble
                      key={
                        message.id
                      }
                      role={
                        message.role
                      }
                      content={
                        message.content
                      }
                      Icon={
                        Icon
                      }
                    />
                  ),
                )}

                {streaming !==
                null ? (
                  <ChatBubble
                    role="assistant"
                    content={
                      streaming ||
                      "…"
                    }
                    streaming
                    Icon={
                      Icon
                    }
                  />
                ) : null}
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* COMPOSER                                                         */}
          {/* ---------------------------------------------------------------- */}

          <div className="border-t border-border/40 p-3 md:p-4">
            <form
              onSubmit={(
                event,
              ) => {
                event.preventDefault();

                void handleSend();
              }}
              className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border/60 bg-background/50 p-2 focus-within:border-primary/50"
            >
              <textarea
                value={
                  input
                }
                onChange={(
                  event,
                ) =>
                  setInput(
                    event.target.value,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();

                    void handleSend();
                  }
                }}
                rows={
                  1
                }
                placeholder={`Message ${title}… (Enter to send, Shift+Enter for newline)`}
                className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                disabled={
                  sending
                }
              />

              <Button
                type="submit"
                size="sm"
                disabled={
                  sending ||
                  !input.trim()
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow"
                aria-label="Send"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>

            <div className="mx-auto mt-2 flex max-w-3xl flex-col items-center justify-between gap-2 sm:flex-row">
              <p className="text-center text-[10px] text-muted-foreground sm:text-left">
                Cossa AI can make mistakes. Verify important information.
              </p>

              {missionBridgeEnabled ? (
                <button
                  type="button"
                  onClick={
                    handleOpenMissionPanel
                  }
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-primary transition-opacity hover:opacity-80"
                >
                  <Workflow className="h-3 w-3" />

                  Turn this work into a workforce mission
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CHAT BUBBLE                                                                */
/* -------------------------------------------------------------------------- */

function ChatBubble({
  role,
  content,
  streaming,
  Icon,
}: {
  role:
    string;

  content:
    string;

  streaming?:
    boolean;

  Icon:
    LucideIcon;
}) {
  const isUser =
    role ===
    "user";

  return (
    <div
      className={cn(
        "flex gap-3",

        isUser
          ? "justify-end"
          : "justify-start",
      )}
    >
      {!isUser ? (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
      ) : null}

      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",

          isUser
            ? "border border-primary/30 bg-primary/15 text-foreground"
            : "border border-border/60 bg-card/40",
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">
            {
              content
            }
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none break-words prose-headings:font-display prose-p:my-2 prose-pre:my-2">
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
              ]}
            >
              {
                content
              }
            </ReactMarkdown>

            {streaming ? (
              <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />
            ) : null}
          </div>
        )}
      </div>

      {isUser ? (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <User className="h-3.5 w-3.5" />
        </div>
      ) : null}
    </div>
  );
}
