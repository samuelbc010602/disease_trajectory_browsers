from IPython import embed
from collections import defaultdict
import pandas as pd

def remove_subs(trajectories):
    # Build trie
    Trie = lambda: defaultdict(Trie)
    trie = Trie()
    for traj in trajectories:
        node = trie
        for step in traj:
            node = node[step]
        node["_end_"] = True  # mark end of trajectory

    # Collect only trajectories that are not prefix of others
    def dfs(node, path, results):
        if "_end_" in node and len(node) == 1:
            results.append(path)
        for key, child in node.items():
            if key != "_end_":
                dfs(child, path + [key], results)

    results = []
    dfs(trie, [], results)
    return results


if __name__ == "__main__":
    data = {
        "edges": [
            {
            "data": {
                "gender_trajectories": "female",
                "patient_count": 50950,
                "relativerisk": 1.21191,
                "shared_name": "15102250 (pp) 01100004",
                "source": "20702",
                "target": "47898",
                "trajectory": "15102250_01100004",
                "id": 123948
            }
            },
            {
            "data": {
                "gender_trajectories": "male",
                "patient_count": 64128,
                "relativerisk": 1.07999,
                "shared_name": "80109539 (pp) 01100004",
                "source": "71220",
                "target": "155512",
                "trajectory": "80109539_01100004",
                "id": 177755
            }
            },
            {
            "data": {
                "gender_trajectories": "male",
                "patient_count": 60332,
                "relativerisk": 1.08711,
                "shared_name": "80109560 (pp) 01100004",
                "source": "678",
                "target": "155512",
                "trajectory": "80109560_01100004",
                "id": 182272
            }
            },
            {
            "data": {
                "gender_trajectories": "female",
                "patient_count": 106235,
                "relativerisk": 1.04586,
                "shared_name": "80109560 (pp) 01100004",
                "source": "25936",
                "target": "47898",
                "trajectory": "80109560_01100004",
                "id": 252776
            }
            }
        ],
        "nodes": [
            {
            "data": {
                "color": "#57341f",
                "gender_trajectories": "male",
                "shared_name": "80109560",
                "id": "678",
                "gender": "male",
                "full_name": "80109560 : Telephone consultation"
            }
            },
            {
            "data": {
                "color": "#57341f",
                "gender_trajectories": "male",
                "shared_name": "80109539",
                "id": "71220",
                "gender": "male",
                "full_name": "80109539 : Consultation"
            }
            },
            {
            "data": {
                "color": "#19141f",
                "gender_trajectories": "male",
                "shared_name": "01100004",
                "id": "155512",
                "gender": "male",
                "full_name": "01100004 : 1st consultation"
            }
            },
            {
            "data": {
                "color": "#c99e6f",
                "gender_trajectories": "female",
                "shared_name": "15102250",
                "id": "20702",
                "gender": "female",
                "full_name": "15102250 : Later consultation"
            }
            },
            {
            "data": {
                "color": "#57341f",
                "gender_trajectories": "female",
                "shared_name": "80109560",
                "id": "25936",
                "gender": "female",
                "full_name": "80109560 : Telephone consultation"
            }
            },
            {
            "data": {
                "color": "#19141f",
                "gender_trajectories": "female",
                "shared_name": "01100004",
                "id": "47898",
                "gender": "female",
                "full_name": "01100004 : 1st consultation"
            }
            }
        ]
    }
    all_trajectories = {f'{x["data"]["trajectory"]}-{x["data"]["gender_trajectories"]}' for x in data["edges"]}

    men_traj = [x.split("-")[0].split("_") for x in all_trajectories if x.endswith("male")]
    women_traj = [x.split("-")[0].split("_") for x in all_trajectories if x.endswith("female")]

    men_traj = remove_subs(men_traj)
    women_traj = remove_subs(women_traj)

    edges = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))

    for edge in data["edges"]:
        source,target = edge["data"]["shared_name"].split(" (pp) ")
        edge["data"]["source"] = source
        edge["data"]["target"] = target
        edges[edge["data"]["gender_trajectories"]][edge["data"]["trajectory"]][edge["data"]["shared_name"]] = edge["data"]

    nodes = {}
    for node in data["nodes"]:
        node["data"]["id"] = node["data"]["shared_name"]
        nodes[node["data"]["shared_name"]] = node

    newNodes = []
    newEdges = []

    for trajs in [(men_traj,"male"),(women_traj,"female")]:
        for traj in trajs[0]:
            traj_str = "_".join(traj)
            for i,code in enumerate(traj):
                if i == len(traj)-1:
                    continue
                shared_name = f"{code} (pp) {traj[i+1]}"
                newEdges.append(edges[trajs[1]][traj_str][shared_name])

                newNodes.append(nodes[code])
                if i == len(traj)-2:
                    newNodes.append(nodes[traj[i+1]])

    embed()

            

            




