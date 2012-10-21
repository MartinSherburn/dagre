dagre.layout = (function() {
  function acyclic(g) {
    var onStack = {};
    var visited = {};
    var reversed = [];

    function dfs(u) {
      if (u in visited)
        return;

      visited[u.id()] = true;
      onStack[u.id()] = true;
      u.outEdges().forEach(function(e) {
        var v = e.head();
        if (v.id() in onStack) {
          g.removeEdge(e);
          reversed.push(e.id());
          g.addEdge(e.id(), v, u, e.attrs);
        } else {
          dfs(v);
        }
      });

      delete onStack[u.id()];
    }

    g.nodes().forEach(function(u) {
      dfs(u);
    });

    return reversed;
  }

  function undoAcyclic(g, reversed) {
    reversed.forEach(function(eId) {
      var e = g.edge(eId);
      g.removeEdge(e);
      if (e.attrs.points) {
        e.attrs.points.reverse();
      }
      g.addEdge(e.id(), e.head(), e.tail(), e.attrs);
    });
  }

  function removeSelfLoops(g) {
    var selfLoops = [];
    g.nodes().forEach(function(u) {
      var es = u.outEdges(u);
      es.forEach(function(e) {
        selfLoops.push(e);
        g.removeEdge(e);
      });
    });
    return selfLoops;
  }

  function addSelfLoops(g, selfLoops) {
    selfLoops.forEach(function(e) {
      g.addEdge(e.id(), e.head(), e.tail(), e.attrs);
    });
  }

  // Assumes input graph has no self-loops and is otherwise acyclic.
  function addDummyNodes(g) {
    g.edges().forEach(function(e) {
      var prefix = "_dummy-" + e.id() + "-";
      var u = e.tail();
      var sinkRank = e.head().attrs.rank;
      if (u.attrs.rank + 1 < sinkRank) {
        g.removeEdge(e);
        e.attrs.edgeId = e.id();
        for (var rank = u.attrs.rank + 1; rank < sinkRank; ++rank) {
          var vId = prefix + rank;
          var v = g.addNode(vId, { rank: rank,
                                   dummy: true,
                                   height: 0,
                                   width: 0,
                                   marginX: 0,
                                   marginY: 0 });
          g.addEdge(null, u, v, e.attrs);
          u = v;
        }
        g.addEdge(null, u, e.head(), e.attrs);
      }
    });
  }

  return function(g) {
    if (g.nodes().length === 0) {
      // Nothing to do!
      return;
    }

    var selfLoops = removeSelfLoops(g);
    var reversed = acyclic(g);

    dagre.layout.rank(g);

    addDummyNodes(g);
    var layering = dagre.layout.order(g);

    dagre.layout.position(g, layering);

    dagre.layout.edges(g);

    undoAcyclic(g, reversed);
    addSelfLoops(g, selfLoops);
  };
})();