'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

interface GraphNode {
  id: string
  type: 'user' | 'skill' | 'job' | 'company' | 'preference' | 'fact'
  label: string
  data?: Record<string, unknown>
  // Computed during layout
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface GraphEdge {
  source: string
  target: string
  type: string
  weight?: number
  label?: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

interface KnowledgeGraphProps {
  data: GraphData
  width?: number
  height?: number
  onNodeClick?: (node: GraphNode) => void
  title?: string
}

// Colors for different node types
const NODE_COLORS: Record<string, string> = {
  user: '#8B5CF6',      // purple
  skill: '#3B82F6',     // blue
  job: '#10B981',       // green
  company: '#F59E0B',   // amber
  preference: '#EC4899', // pink
  fact: '#6366F1',      // indigo - for Zep facts
}

// Node sizes
const NODE_SIZES: Record<string, number> = {
  user: 30,
  skill: 18,
  job: 22,
  company: 20,
  preference: 16,
  fact: 14,
}

export function KnowledgeGraph({
  data,
  width = 600,
  height = 400,
  onNodeClick,
  title,
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const animationRef = useRef<number | null>(null)

  // Initialize and run force simulation
  useEffect(() => {
    if (!data.nodes.length) return

    // Initialize node positions
    const centerX = width / 2
    const centerY = height / 2
    const initialNodes = data.nodes.map((node, i) => {
      // Position user at center, others in a circle
      if (node.type === 'user') {
        return { ...node, x: centerX, y: centerY, vx: 0, vy: 0 }
      }

      const angle = (2 * Math.PI * i) / data.nodes.length
      const radius = Math.min(width, height) * 0.35
      return {
        ...node,
        x: centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 50,
        y: centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
      }
    })

    setNodes(initialNodes)

    // Simple force simulation
    let frameCount = 0
    const maxFrames = 100

    const simulate = () => {
      if (frameCount >= maxFrames) return

      setNodes(currentNodes => {
        const newNodes = [...currentNodes]

        // Apply forces
        for (let i = 0; i < newNodes.length; i++) {
          const node = newNodes[i]
          if (!node.x || !node.y) continue

          // Keep user centered
          if (node.type === 'user') {
            node.x = centerX
            node.y = centerY
            continue
          }

          // Repulsion from other nodes
          for (let j = 0; j < newNodes.length; j++) {
            if (i === j) continue
            const other = newNodes[j]
            if (!other.x || !other.y) continue

            const dx = node.x - other.x
            const dy = node.y - other.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const minDist = 60
            if (dist < minDist) {
              const force = (minDist - dist) * 0.05
              node.vx = (node.vx || 0) + (dx / dist) * force
              node.vy = (node.vy || 0) + (dy / dist) * force
            }
          }

          // Attraction to connected nodes
          data.edges.forEach(edge => {
            if (edge.source !== node.id && edge.target !== node.id) return

            const otherId = edge.source === node.id ? edge.target : edge.source
            const other = newNodes.find(n => n.id === otherId)
            if (!other?.x || !other?.y || !node.x || !node.y) return

            const dx = other.x - node.x
            const dy = other.y - node.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const targetDist = 100
            const force = (dist - targetDist) * 0.01
            node.vx = (node.vx || 0) + (dx / dist) * force
            node.vy = (node.vy || 0) + (dy / dist) * force
          })

          // Center gravity
          node.vx = (node.vx || 0) + (centerX - node.x) * 0.001
          node.vy = (node.vy || 0) + (centerY - node.y) * 0.001

          // Apply velocity with damping
          node.x += (node.vx || 0) * 0.8
          node.y += (node.vy || 0) * 0.8
          node.vx = (node.vx || 0) * 0.9
          node.vy = (node.vy || 0) * 0.9

          // Keep in bounds
          const margin = 40
          node.x = Math.max(margin, Math.min(width - margin, node.x))
          node.y = Math.max(margin, Math.min(height - margin, node.y))
        }

        return newNodes
      })

      frameCount++
      animationRef.current = requestAnimationFrame(simulate)
    }

    simulate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [data, width, height])

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setSelectedNode(selectedNode?.id === node.id ? null : node)
      onNodeClick?.(node)
    },
    [selectedNode, onNodeClick]
  )

  if (!data.nodes.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-600">
        No graph data available
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Title */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
      )}

      {/* Legend */}
      <div className="absolute top-2 left-2 bg-white/90 rounded-lg p-2 shadow-sm border text-xs z-10">
        <div className="flex flex-wrap gap-3">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Graph */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full bg-gray-50 rounded-xl border border-gray-200"
        style={{ height: `${height}px` }}
      >
        {/* Edges */}
        {data.edges.map((edge, i) => {
          const source = nodes.find(n => n.id === edge.source)
          const target = nodes.find(n => n.id === edge.target)
          if (!source?.x || !source?.y || !target?.x || !target?.y) return null

          const isHighlighted =
            hoveredNode &&
            (hoveredNode.id === edge.source || hoveredNode.id === edge.target)

          return (
            <g key={`edge-${i}`}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={isHighlighted ? '#8B5CF6' : '#CBD5E1'}
                strokeWidth={isHighlighted ? 2 : 1}
                opacity={hoveredNode && !isHighlighted ? 0.2 : 0.6}
                className="transition-all duration-200"
              />
              {/* Edge label */}
              {edge.label && isHighlighted && (
                <text
                  x={(source.x + target.x) / 2}
                  y={(source.y + target.y) / 2}
                  textAnchor="middle"
                  className="text-xs fill-purple-700"
                  dy={-5}
                >
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {nodes.map(node => {
          if (!node.x || !node.y) return null

          const color = NODE_COLORS[node.type] || NODE_COLORS.skill
          const size = NODE_SIZES[node.type] || 16
          const isSelected = selectedNode?.id === node.id
          const isHovered = hoveredNode?.id === node.id
          const isDimmed = hoveredNode && !isHovered && !data.edges.some(
            e => (e.source === hoveredNode.id && e.target === node.id) ||
                 (e.target === hoveredNode.id && e.source === node.id) ||
                 e.source === node.id || e.target === node.id
          )

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onClick={() => handleNodeClick(node)}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Selection ring */}
              {isSelected && (
                <circle
                  r={size + 6}
                  fill="none"
                  stroke={color}
                  strokeWidth={3}
                  opacity={0.5}
                />
              )}

              {/* Hover ring */}
              {isHovered && !isSelected && (
                <circle
                  r={size + 4}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.3}
                />
              )}

              {/* Node circle */}
              <circle
                r={size}
                fill={color}
                opacity={isDimmed ? 0.2 : 1}
                className="transition-opacity duration-200"
              />

              {/* Icon/text inside node */}
              <text
                textAnchor="middle"
                dy={4}
                className="fill-white text-xs font-medium pointer-events-none"
              >
                {getNodeIcon(node.type)}
              </text>

              {/* Label below node */}
              <text
                y={size + 14}
                textAnchor="middle"
                className="text-xs fill-gray-700 font-medium pointer-events-none"
                opacity={isDimmed ? 0.3 : 1}
              >
                {truncateLabel(node.label, 15)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-xs z-10">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: NODE_COLORS[selectedNode.type] }}
            />
            <span className="font-semibold">{selectedNode.label}</span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              Type: <span className="capitalize">{selectedNode.type}</span>
            </p>
            {selectedNode.data &&
              Object.entries(selectedNode.data).map(([key, value]) => (
                <p key={key}>
                  {key}: <span className="font-medium">{String(value)}</span>
                </p>
              ))}
            <p className="text-xs text-gray-600 mt-2">
              {data.edges.filter(
                e => e.source === selectedNode.id || e.target === selectedNode.id
              ).length}{' '}
              connections
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function getNodeIcon(type: string): string {
  switch (type) {
    case 'user':
      return '👤'
    case 'skill':
      return '🎯'
    case 'job':
      return '💼'
    case 'company':
      return '🏢'
    case 'preference':
      return '⚙️'
    case 'fact':
      return '📝'
    default:
      return '•'
  }
}

function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label
  return label.slice(0, maxLength - 2) + '...'
}

export default KnowledgeGraph
