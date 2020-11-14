import logo from "./logo.svg";
import "./App.css";
import Button from "@material-ui/core/Button";
import TreeView from "@material-ui/lab/TreeView";
import TreeItem from "@material-ui/lab/TreeItem";
import { makeStyles } from "@material-ui/core/styles";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

const getRealId = (str) => {
  const arr = str.split(">");
  return arr[arr.length - 1];
};

function styleForFlowLevel(level) {
  switch (level) {
    case "none":
      return { color: "red" };
    case "flow":
      return { color: "#C90" };
    case "strict-local":
      return { color: "#060" };
    case "strict":
      return { color: "gray", textDecoration: "line-through" };
    case "unknown":
      return { color: "purple" };
    default:
      return { color: "black" };
  }
}

function valueForLevel(level) {
  switch (level) {
    case "none":
      return 1;
    case "flow":
      return 2;
    case "strict-local":
      return 3;
    case "strict":
      return 4;
    case "unknown":
      return NaN;
    default:
      return NaN;
  }
}

function levelForValue(value) {
  if (Number.isNaN(value)) {
    return "unknown";
  }
  switch (value) {
    case 1:
      return "none";
    case 2:
      return "flow";
    case 3:
      return "strict-local";
    case 4:
      return "strict";
    default:
      return "unknown";
  }
}

function App() {
  const [tree, setTree] = useState(null);
  const ROOT = tree && Object.keys(tree)[0];
  // Renders our tree by dynamically creating nodes.
  // Since our tree could have cycles, we create children for a node
  // dynamically based on wether our parent is expanded (and we're showing).
  // If I'm not expanded, I still want to create my children if I'm visible
  // (ie, if my parent is expanded), so that I recieve onNodeToggle events.
  // Note: since each tree item needs a unique id (so that it can be expanded
  // independently of other appearances of the same node in the tree), we give
  // each item its path as an "id". This path is the ids of all its parents
  // concatenated by ">". We can use this id to get the "real" id of an item
  // too, to lookup in our data source, by just getting the last id in the
  // ">"-joined chain/path.
  const renderTree = (nodeId, expandedIds, parentId = null) => {
    const isExpanded = (id) => expandedIds.indexOf(id) !== -1;

    const definition = tree[getRealId(nodeId)];
    const name = definition ? definition.name : getRealId(nodeId);
    const node = { id: nodeId, name };
    const flowLevel = getLevelForId(node.id);
    let canMakeStrict = false;

    // console.log(node.id, expandedIds);
    if (parentId == null || isExpanded(parentId)) {
      if (!definition) {
        console.log("no def for", getRealId(node.id));
      } else {
        const deps = tree[getRealId(node.id)].deps;
        node.children = deps.map((depId) => {
          return node.id + ">" + depId;
        });

        const depsMinLevel = deps.reduce((acc, dep) => {
          const level = getLevelForId(dep);
          return Math.min(acc, valueForLevel(level));
        }, valueForLevel("strict"));

        if (
          (levelForValue(depsMinLevel) === "strict" ||
            levelForValue(depsMinLevel) === "strict-local") &&
          flowLevel !== "strict"
        ) {
          canMakeStrict = true;
        }
      }
    }
    return (
      <TreeItem
        key={node.id}
        nodeId={node.id}
        style={styleForFlowLevel(flowLevel)}
        label={(canMakeStrict ? "⬆️ " : "") + node.name}
      >
        {Array.isArray(node.children)
          ? node.children.map((child) =>
              renderTree(child, expandedIds, node.id)
            )
          : null}
      </TreeItem>
    );
  };

  function getLevelForId(id) {
    const definition = tree[getRealId(id)];
    const flowLevel = definition ? definition.flowLevel : "unknown";
    return flowLevel;
  }

  const [expanded, setExpanded] = useState([ROOT]);
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];

    if (file.type !== "application/json") {
      return;
    }
    file.text().then(function (data) {
      setTree(JSON.parse(data));
    });
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div style={{ margin: "0px 12%" }}>
      <h1>flow-dep-graph</h1>
      {!tree && (
        <div {...getRootProps()} className="dropzone">
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the files here ...</p>
          ) : (
            <p>Drag 'n' drop some files here, or click to select files</p>
          )}
        </div>
      )}
      <p style={{ padding: "16px 18px", background: "#EEE" }}>
        Flow levels:
        <ul>
          {["none", "flow", "strict-local", "strict", "unknown"].map(
            (level) => (
              <li style={styleForFlowLevel(level)} key={level}>
                {level}
              </li>
            )
          )}
        </ul>
        Items marked with ⬆️ have all-strict deps, and be upgraded to "strict".
      </p>
      <hr />
      {tree !== null && (
        <TreeView
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpanded={[ROOT]}
          defaultExpandIcon={<ChevronRightIcon />}
          onNodeSelect={function (_event, ids) {
            // console.log("selected", ids);
          }}
          expanded={expanded}
          onNodeToggle={(_event, expanded) => {
            setExpanded(expanded);
            // console.log("toggled", expanded);
          }}
        >
          {renderTree(ROOT, expanded)}
        </TreeView>
      )}
    </div>
  );
}

export default App;
