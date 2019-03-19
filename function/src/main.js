/* eslint-disable max-len */

const api = require('azure-devops-node-api');
const task = require('azure-pipelines-task-lib/task');
const buildInterface = require('azure-devops-node-api/interfaces/BuildInterfaces');

const getConnection = () => {
  const url = task.getVariable('System.TeamFoundationCollectionUri');
  const token = task.getVariable('System.AccessToken');
  if (!token) {
    throw new Error('Agent unable to access System.AccessToken, please enable "Allow scripts to access the OAuth token" to proceed.');
  }
  const handler = api.getBearerHandler(token);
  return new api.WebApi(url, handler);
};

const buildIds = build => build.definition.id;

const run = async () => {
  try {
    console.log('Getting environment variables...');
    const project = task.getVariable('System.TeamProject');
    const definitionId = parseInt(task.getVariable('Release.DefinitionId'), 10);
    const triggeringArtifact = task.getVariable('Release.TriggeringArtifact.Alias');
    const triggeringArtifactSourceBranch = task.getVariable(`Release.Artifacts.${triggeringArtifact}.SourceBranch`);
    const triggeringArtifactSourceBranchName = task.getVariable(`Release.Artifacts.${triggeringArtifact}.SourceBranchName`);
    console.log('Connecting to APIs...');
    const connection = getConnection();
    const buildApi = await connection.getBuildApi();
    const releaseApi = await connection.getReleaseApi();
    console.log('Getting release definition...');
    const definition = await releaseApi.getReleaseDefinition(project, definitionId);
    const buildsForReleaseDefinition = definition.artifacts.map(artifact => ({
      alias: artifact.alias,
      id: parseInt(artifact.definitionReference.definition.id, 10),
    }));
    const triggeringBranchBuilds = await buildApi.getBuilds(project, buildsForReleaseDefinition.map(build => build.id), undefined, undefined, undefined, undefined, undefined, undefined, buildInterface.BuildStatus.Completed, buildInterface.BuildResult.Succeeded, undefined, undefined, undefined, undefined, 1, undefined, undefined, triggeringArtifactSourceBranch);
    const fallbackBranch = (triggeringArtifactSourceBranch.indexOf('refs/heads/feature/') > -1) ? 'refs/heads/develop' : 'refs/heads/master';
    const fallbackBranchBuilds = (buildsForReleaseDefinition.filter(build => !(triggeringBranchBuilds.map(buildIds).includes(build.id))).length > 0)
      ? await buildApi.getBuilds(project, buildsForReleaseDefinition.filter(build => !(triggeringBranchBuilds.map(buildIds).includes(build.id))).map(build => build.id), undefined, undefined, undefined, undefined, undefined, undefined, buildInterface.BuildStatus.Completed, buildInterface.BuildResult.Succeeded, undefined, undefined, undefined, undefined, 1, undefined, undefined, fallbackBranch)
      : [];
    const otherBranchBuilds = (buildsForReleaseDefinition.filter(build => !(triggeringBranchBuilds.map(buildIds).includes(build.id)) && !(fallbackBranchBuilds.map(buildIds).includes(build.id))).length > 0)
      ? await buildApi.getBuilds(project, buildsForReleaseDefinition.filter(build => !(triggeringBranchBuilds.map(buildIds).includes(build.id)) && !(fallbackBranchBuilds.map(buildIds).includes(build.id))).map(build => build.id), undefined, undefined, undefined, undefined, undefined, undefined, buildInterface.BuildStatus.Completed, buildInterface.BuildResult.Succeeded, undefined, undefined, undefined, undefined, 1)
      : [];
    console.log('Looping through builds...');
    [].concat.apply([], [triggeringBranchBuilds, fallbackBranchBuilds, otherBranchBuilds]).forEach((build) => {
      task.setVariable(`Release.Artifacts.${buildsForReleaseDefinition.find(buildForReleaseDefinition => buildForReleaseDefinition.id === build.definition.id).alias}.KiloudeBuildId`, build.buildNumber.toString());
    });
    task.setVariable('Release.Artifacts.TriggeringArtifact.KiloudeSourceBranch', triggeringArtifactSourceBranch);
    task.setVariable('Release.Artifacts.TriggeringArtifact.KiloudeSourceBranchName', triggeringArtifactSourceBranchName);
    if (otherBranchBuilds.length > 0) {
      console.log(`Unable to find build on triggering branch or fallback branch for ${otherBranchBuilds.map(build => build.definition.name).toString()}`);
      throw new Error('Builds not found on triggering branch, or fallback branch. To ignore this error, select "Continue on error" from "Control Options".');
    }
  } catch (err) {
    task.setResult(task.TaskResult.Failed, err.message);
  }
};

module.exports = {
  run,
};
