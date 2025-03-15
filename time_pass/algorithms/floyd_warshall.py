def floyd_warshall(dist, next_node, n):
    """
    Implements the Floyd-Warshall algorithm to find shortest paths between all pairs of vertices.
    
    Args:
        dist: Distance matrix where dist[i][j] is the distance from vertex i to j
        next_node: Matrix to store the next node in the shortest path
        n: Number of vertices
        
    Returns:
        Updated dist and next_node matrices
    """
    # Initialize the algorithm
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] != float('inf') and dist[k][j] != float('inf'):
                    if dist[i][j] > dist[i][k] + dist[k][j]:
                        dist[i][j] = dist[i][k] + dist[k][j]
                        next_node[i][j] = next_node[i][k]
    
    return dist, next_node

def reconstruct_path(next_node, start, end):
    """
    Reconstructs the shortest path from start to end using the next_node matrix.
    
    Args:
        next_node: Matrix where next_node[i][j] is the next vertex after i in the shortest path to j
        start: Starting vertex
        end: Ending vertex
        
    Returns:
        List of vertices in the shortest path
    """
    if next_node[start][end] is None:
        return []
    
    path = [start]
    while start != end:
        start = next_node[start][end]
        path.append(start)
    
    return path 