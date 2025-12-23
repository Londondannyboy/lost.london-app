/**
 * Zep Ontology for Lost London / VIC
 *
 * Defines entity types and edge types for London history knowledge graph.
 * Based on Vic Keegan's 372 articles and Thorney Island book.
 */

import { ZepClient, entityFields, EntityType, EdgeType } from "@getzep/zep-cloud";
import { LOST_LONDON_GRAPH_ID } from "./zep";

// Entity type definitions for the London history domain

// Historical figures mentioned in London history
export const PersonSchema: EntityType = {
  description: "Historical figures and people mentioned in London history articles",
  fields: {
    era: entityFields.text("Time period: Roman, Medieval, Tudor, Stuart, Georgian, Victorian, Modern"),
    role: entityFields.text("Their role: monarch, writer, architect, politician, artist, etc."),
  },
};

// Geographic locations in London
export const PlaceSchema: EntityType = {
  description: "Geographic locations, areas, and neighborhoods in London",
  fields: {
    borough: entityFields.text("Modern London borough if applicable"),
    status: entityFields.text("Whether this place still exists: extant, lost, renamed, transformed"),
  },
};

// Structures, monuments, venues
export const BuildingSchema: EntityType = {
  description: "Structures, monuments, theatres, churches, palaces, and venues in London",
  fields: {
    building_type: entityFields.text("Type: church, theatre, palace, prison, museum, pub, market, etc."),
    period: entityFields.text("Historical period when most significant: Roman, Medieval, Tudor, etc."),
  },
};

// Waterways including hidden underground rivers
export const RiverSchema: EntityType = {
  description: "Rivers and waterways in London, including hidden underground rivers",
  fields: {
    status: entityFields.text("Current status: visible, underground, culverted, lost"),
  },
};

// Historical time periods
export const EraSchema: EntityType = {
  description: "Historical time periods in London's history",
  fields: {
    period: entityFields.text("Era name: Roman, Medieval, Tudor, Stuart, Georgian, Victorian, Edwardian, Modern"),
  },
};

// Significant historical events
export const EventSchema: EntityType = {
  description: "Significant historical events in London's history",
  fields: {
    event_type: entityFields.text("Type: fire, war, coronation, construction, demolition, opening, execution, etc."),
  },
};

// Vic Keegan's written articles
export const ArticleSchema: EntityType = {
  description: "Vic Keegan's Lost London articles and Thorney Island book chapters",
  fields: {
    category: entityFields.text("Category: Hidden gems, Lost London, Thorney Island, etc."),
  },
};

// Themes and subject areas
export const TopicSchema: EntityType = {
  description: "Themes and subject areas in London history",
  fields: {
    category: entityFields.text("Topic category: hidden rivers, lost theatres, Roman ruins, royal history, etc."),
  },
};

// Users who interact with VIC
export const VisitorSchema: EntityType = {
  description: "Users who interact with VIC voice assistant",
  fields: {
    interest_level: entityFields.text("Their engagement level: casual, enthusiast, researcher"),
  },
};

// All entity types
export const entityTypes = {
  Person: PersonSchema,
  Place: PlaceSchema,
  Building: BuildingSchema,
  River: RiverSchema,
  Era: EraSchema,
  Event: EventSchema,
  Article: ArticleSchema,
  Topic: TopicSchema,
  Visitor: VisitorSchema,
};

// Edge type definitions

// Spatial relationship: X is located in Y
export const LocatedInEdge: EdgeType = {
  description: "Spatial relationship - Building/Place is located within a larger Place or Borough",
  fields: {},
  sourceTargets: [
    { source: "Building", target: "Place" },
    { source: "Place", target: "Place" },
  ],
};

// Temporal relationship: X was built/happened during Y era
export const OccurredDuringEdge: EdgeType = {
  description: "Temporal relationship - Event/Building dates from a particular Era",
  fields: {},
  sourceTargets: [
    { source: "Building", target: "Era" },
    { source: "Event", target: "Era" },
  ],
};

// Authorship: Article covers topic/place
export const WroteAboutEdge: EdgeType = {
  description: "Authorship relationship - Article covers a Topic, Place, Building, or Person",
  fields: {},
  sourceTargets: [
    { source: "Article", target: "Topic" },
    { source: "Article", target: "Place" },
    { source: "Article", target: "Building" },
    { source: "Article", target: "Person" },
  ],
};

// Geographic: River flows through place
export const FlowsThroughEdge: EdgeType = {
  description: "Geographic relationship - River flows through a Place",
  fields: {},
  sourceTargets: [{ source: "River", target: "Place" }],
};

// Historical association: Person connected to Place/Building/Event
export const AssociatedWithEdge: EdgeType = {
  description: "Historical association - Person is connected to Place, Building, or Event",
  fields: {},
  sourceTargets: [
    { source: "Person", target: "Place" },
    { source: "Person", target: "Building" },
    { source: "Person", target: "Event" },
  ],
};

// User preference: Visitor interested in Topic/Era/Place
export const InterestedInEdge: EdgeType = {
  description: "User preference - Visitor has shown interest in a Topic, Era, or Place",
  fields: {},
  sourceTargets: [
    { source: "Visitor", target: "Topic" },
    { source: "Visitor", target: "Era" },
    { source: "Visitor", target: "Place" },
  ],
};

// Hierarchical: Part of larger entity
export const PartOfEdge: EdgeType = {
  description: "Hierarchical relationship - Place/Building is part of a larger Place",
  fields: {},
  sourceTargets: [
    { source: "Place", target: "Place" },
    { source: "Building", target: "Place" },
  ],
};

// Destruction: Building destroyed in Event
export const DestroyedInEdge: EdgeType = {
  description: "Destruction relationship - Building was destroyed in an Event",
  fields: {},
  sourceTargets: [{ source: "Building", target: "Event" }],
};

// Temporal overlap: Person lived at same time as another
export const ContemporaryOfEdge: EdgeType = {
  description: "Temporal overlap - Person lived at the same time as another Person",
  fields: {},
  sourceTargets: [{ source: "Person", target: "Person" }],
};

// Related content: Topic relates to another Topic
export const RelatedToEdge: EdgeType = {
  description: "Thematic relationship - Topic is related to another Topic",
  fields: {},
  sourceTargets: [
    { source: "Topic", target: "Topic" },
    { source: "Place", target: "Place" },
  ],
};

// All edge types
export const edgeTypes = {
  LOCATED_IN: LocatedInEdge,
  OCCURRED_DURING: OccurredDuringEdge,
  WROTE_ABOUT: WroteAboutEdge,
  FLOWS_THROUGH: FlowsThroughEdge,
  ASSOCIATED_WITH: AssociatedWithEdge,
  INTERESTED_IN: InterestedInEdge,
  PART_OF: PartOfEdge,
  DESTROYED_IN: DestroyedInEdge,
  CONTEMPORARY_OF: ContemporaryOfEdge,
  RELATED_TO: RelatedToEdge,
};

/**
 * Apply the London History ontology to the Lost London graph
 */
export async function applyOntology(apiKey: string) {
  const client = new ZepClient({ apiKey });

  // Apply ontology to the Lost London graph
  await client.graph.setOntology(
    entityTypes,
    edgeTypes,
    {
      graphIds: [LOST_LONDON_GRAPH_ID],
    }
  );

  console.log("Ontology applied successfully to graph:", LOST_LONDON_GRAPH_ID);
}

// Note: listOntology API method not available in current SDK version
