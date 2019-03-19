# Get Builds for Triggering Build Branch

This Azure DevOps task gets builds which were built from the same branch as the triggering build's branch.

The primary purpose of the task is to get the latest builds from a feature branch for a triggering build, falling back to develop where a triggering build cannot be located (to be used in conjunction with 'Cancel Build for CI Trigger' task).

Build IDs found by the task are exposed as variables in the format, `Release.Artifacts.${Alias}.KiloudeBuildId`.

Please note that the task assumes the triggering source is following the Gitflow workflow.

## Build Instructions

Navigate to the function directory

```
cd function
```

and run the build command

```
npm run build
```

(after the initial build, please remember to increase the version number in vss-extension.json, task.json and package.json).

## Azure DevOps Installation Instructions/Requirements

For Azure DevOps installation instructions/requirements please see [marketplace.md](marketplace.md).

## License

MIT

## Acknowledgments

* Icon by Smashicons licensed under CC 3.0 BY