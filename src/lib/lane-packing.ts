import { ProductionOperation } from './types';

export interface PackedLane {
  operations: ProductionOperation[];
  endTime: Date;
}

// Pack operations into lanes to minimize visual conflicts
export function packOperationsIntoLanes(operations: ProductionOperation[]): ProductionOperation[][] {
  if (operations.length === 0) return [];
  
  // Sort operations by start time
  const sortedOps = [...operations].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  const lanes: PackedLane[] = [];
  
  for (const operation of sortedOps) {
    // Find the first lane where this operation can fit
    let targetLane = lanes.find(lane => lane.endTime <= operation.startTime);
    
    if (!targetLane) {
      // Create new lane
      targetLane = {
        operations: [],
        endTime: new Date(0)
      };
      lanes.push(targetLane);
    }
    
    targetLane.operations.push(operation);
    targetLane.endTime = new Date(Math.max(targetLane.endTime.getTime(), operation.endTime.getTime()));
  }
  
  return lanes.map(lane => lane.operations);
}

export const LANE_HEIGHT = 24;
export const LANE_GAP = 4;
export const ROW_GAP = 16;

export function calculateRowHeight(laneCount: number): number {
  if (laneCount === 0) return LANE_HEIGHT;
  return laneCount * LANE_HEIGHT + (laneCount - 1) * LANE_GAP;
}

export function calculateTotalHeight(resourceCount: number, totalLanes: number): number {
  return resourceCount * LANE_HEIGHT + totalLanes * LANE_GAP + (resourceCount - 1) * ROW_GAP;
}