import { FixedVector2 } from "../base/fixed/FixedVector2";

// function distance(a, b) {
//     return FixedVector2.distance(a, b);
// }


// // 计算两点之间的欧几里得距离
  function distance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }
  
  function pointToKey(point) {
    return `${point.x},${point.y}`;
  }
  
  export function aStar(start, end, isObstacle, maxDepth, path, GetNearObstacleCost = null) {
    let openSet = {};
    let closedSet = {};
    start.g = 0;
    start.h = distance(start, end);
    start.f = start.h;
    start.key = pointToKey(start);
    end.key = pointToKey(end);
  
    openSet[start.key] = start;
    let steps = 0;
  
    while (Object.keys(openSet).length > 0) {
      if (steps >= maxDepth) {
        return false;
      }
      
      let current = null;
      for (let key in openSet) {
          if (openSet.hasOwnProperty(key)) {
              let node = openSet[key];
              if (!current || node.f < current.f) {
                  current = node;
              }
          }
      }

      if (current.key === end.key) {
        // Reconstruct path and return
        let node = current;
        while (node) {
            path.unshift({ x: node.x, y: node.y });
            node = node.parent;
        }
        return true;
      }
  
      delete openSet[current.key];
      closedSet[current.key] = current;
  
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if ((dx === 0 && dy === 0) || (dx !== 0 && dy !== 0)) continue;
  
          const neighbor = { x: current.x + dx, y: current.y + dy, key: null, g: 0, h: 0, f: 0, parent: null };
  
          if (closedSet.hasOwnProperty(pointToKey(neighbor))) {
            continue;
          }
  
          if (isObstacle(neighbor)) {
            continue;
          }
  
          const tentativeG = current.g + distance(current, neighbor);
          neighbor.key = pointToKey(neighbor);
  
          if (!openSet.hasOwnProperty(neighbor.key)) {
            openSet[neighbor.key] = neighbor;
          } else if (tentativeG >= openSet[neighbor.key].g) {
            continue;
          }
  
          neighbor.g = tentativeG + (GetNearObstacleCost ? GetNearObstacleCost(current) : 0);
          neighbor.h = distance(neighbor, end);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
        }
      }
      
      steps++;
    }
  
    return false;
  }

  export function smoothPath(path, isObstacle) {
    const newPath = [path[0]];
    let lastValidIndex = 0; // 记录lastValid的索引，而不是lastValid本身
  
    for (let i = 1; i < path.length; i++) {
      let canSkip = true;
  
      // 从当前点i开始，反向检查到上一个“有效点”
      for (let j = i - 1; j > lastValidIndex; j--) {
        if (isObstacle(path[j], path[i])) {
          canSkip = false;
          break;
        }
      }
  
      if (!canSkip) {
        lastValidIndex = i - 1;
        newPath.push(path[lastValidIndex]);
      }
    }
  
    newPath.push(path[path.length - 1]);
    return newPath;
  }
//   Sample usage
//   const originalPath = [
//     { x: 0, y: 0 },
//     { x: 1, y: 1 },
//     { x: 3, y: 2 },
//     { x: 5, y: 5 },
//     { x: 6, y: 7 },
//   ];
  
//   const granularity = 0.1;
//   const smoothed = smoothPath(originalPath, granularity);
  
//   Logger.log("Smoothed Path:", smoothed);
  
  
//   const start = { x: 0, y: 0 };
//   const end = { x: 5, y: 5 };
//   const maxDepth = 100;
//   const path = [];
  
//   const isObstacle = (point) => {
//     // Define your obstacle logic here.
//     return false;
//   };
  
//   const result = aStar(start, end, isObstacle, maxDepth, path);
  
//   if (result) {
//     Logger.log('Path found:', path);
//   } else {
//     Logger.log('Path not found');
//   }
  