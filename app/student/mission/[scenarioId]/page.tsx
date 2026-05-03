import { notFound } from 'next/navigation'
import missionGoalsJson from '@/src/content/mission-goals.json'
import { MissionClient } from './mission-client'
import type { ScenarioProps } from './mission-client'

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>
}) {
  const { scenarioId } = await params

  const raw = missionGoalsJson.find((s) => s.scenarioId === scenarioId)
  if (!raw || !raw.isActive) notFound()

  const scenario: ScenarioProps = {
    scenarioId: raw.scenarioId,
    title: raw.title,
    situation: raw.situation,
    location: raw.location,
    persona: {
      name: raw.persona.name,
      role: raw.persona.role,
      greetingMessage: raw.persona.greetingMessage,
    },
    goals: raw.goals.map((g) => ({
      id: g.id,
      description: g.description,
      achievedAtTurn: g.achievedAtTurn,
      order: g.order,
    })),
    expectedTurns: raw.expectedTurns,
    difficulty: raw.difficulty,
    estimatedMinutes: raw.estimatedMinutes,
    rubric: {
      dimensions: raw.rubric.dimensions.map((d) => ({
        id: d.id,
        label: d.label,
        description: d.description,
      })),
    },
  }

  return <MissionClient scenario={scenario} />
}
