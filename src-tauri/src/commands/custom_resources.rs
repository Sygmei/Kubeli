use crate::k8s::AppState;
use kube::{
    api::{DynamicObject, ListParams},
    discovery::ApiResource,
    Api,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{command, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomResourceInstance {
    pub name: String,
    pub namespace: Option<String>,
    pub uid: String,
    pub created_at: Option<String>,
    pub labels: HashMap<String, String>,
    pub annotations: HashMap<String, String>,
    pub spec: Option<serde_json::Value>,
    pub status: Option<serde_json::Value>,
}

#[command]
pub async fn list_custom_resources(
    state: State<'_, AppState>,
    group: String,
    version: String,
    kind: String,
    plural: String,
    scope: String,
    namespace: Option<String>,
) -> Result<Vec<CustomResourceInstance>, String> {
    let client = match state.k8s.get_client().await {
        Ok(c) => c,
        Err(_) => return Ok(Vec::new()),
    };

    let api_version = if group.is_empty() {
        version.clone()
    } else {
        format!("{}/{}", group, version)
    };

    let ar = ApiResource {
        group: group.clone(),
        version: version.clone(),
        api_version,
        kind: kind.clone(),
        plural: plural.clone(),
    };

    let lp = ListParams::default();

    let result: Result<Vec<DynamicObject>, _> = if scope.to_lowercase() == "namespaced" {
        if let Some(ref ns) = namespace {
            let api: Api<DynamicObject> = Api::namespaced_with(client.clone(), ns, &ar);
            api.list(&lp).await.map(|list| list.items)
        } else {
            let api: Api<DynamicObject> = Api::all_with(client.clone(), &ar);
            api.list(&lp).await.map(|list| list.items)
        }
    } else {
        let api: Api<DynamicObject> = Api::all_with(client.clone(), &ar);
        api.list(&lp).await.map(|list| list.items)
    };

    let items = result.unwrap_or_default();

    Ok(items
        .into_iter()
        .filter_map(parse_custom_resource)
        .collect())
}

fn parse_custom_resource(obj: DynamicObject) -> Option<CustomResourceInstance> {
    let name = obj.metadata.name.clone()?;
    let namespace = obj.metadata.namespace.clone();
    let uid = obj.metadata.uid.clone().unwrap_or_default();
    let created_at = obj
        .metadata
        .creation_timestamp
        .as_ref()
        .map(|t| t.0.to_string());

    let labels = obj
        .metadata
        .labels
        .unwrap_or_default()
        .into_iter()
        .collect();

    let annotations = obj
        .metadata
        .annotations
        .unwrap_or_default()
        .into_iter()
        .collect();

    let spec = obj.data.get("spec").cloned();
    let status = obj.data.get("status").cloned();

    Some(CustomResourceInstance {
        name,
        namespace,
        uid,
        created_at,
        labels,
        annotations,
        spec,
        status,
    })
}
