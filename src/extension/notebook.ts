// import { TextDecoder, TextEncoder } from 'util';
// import * as vscode from 'vscode';
// import * as http from 'http';
// import { DebugProtocol } from '@vscode/debugprotocol';
// import * as path from 'path';

// interface RawNotebookCell {
//   language: string;
//   value: string;
//   kind: vscode.NotebookCellKind;
//   editable?: boolean;
// }

// export class RdbgNotebookSerializer implements vscode.NotebookSerializer {
//   deserializeNotebook(content: Uint8Array, _token: vscode.CancellationToken): vscode.NotebookData | Thenable<vscode.NotebookData> {
//     const decoded = new TextDecoder().decode(content);
//     let rawCell: RawNotebookCell[];
//     try {
//       rawCell = JSON.parse(decoded);
//     } catch (error) {
//       rawCell = [];
//     }

//     const cells = rawCell.map(cell => new vscode.NotebookCellData(cell.kind, cell.value, cell.language));
//     return new vscode.NotebookData(cells);
//   }

//   serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Uint8Array | Thenable<Uint8Array> {
//     const rawCell = data.cells.map(cell => {
//       return {
//         language: cell.languageId,
//         value: cell.value,
//         kind: cell.kind,
//       } as RawNotebookCell;
//     });
//     return new TextEncoder().encode(JSON.stringify(rawCell));
//   }
// }

// export class RdbgNotebookController {
//   readonly controllerId = 'irb-notebook-controller';
//   readonly notebookType = 'irb-notebook';
//   readonly label = 'irb Notebook';
//   readonly supportedLanguage = ['ruby'];

//   private readonly _controller: vscode.NotebookController;
//   private _executionOrder = 0;

//   constructor() {
//     this._controller = vscode.notebooks.createNotebookController(
//       this.controllerId,
//       this.notebookType,
//       this.label
//     );

//     this._controller.supportedLanguages = this.supportedLanguage;
//     this._controller.supportsExecutionOrder = true;
//     this._controller.executeHandler = this._execute.bind(this);
//   }

//   private _execute(cells: vscode.NotebookCell[], _notebook: vscode.NotebookDocument, _controller: vscode.NotebookController) {
//     for (let cell of cells) {
//       this._doExecution(cell);
//     }
//   }

//   dispose() {
//     this._controller.dispose();
//   }

//   private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
//     const execution = this._controller.createNotebookCellExecution(cell);
//     execution.executionOrder = ++this._executionOrder;
//     execution.start(Date.now());
//     const req = { expression: cell.document.getText() };
//     const res = await postJSON(req);
//     console.log(res);
//     execution.replaceOutput([
//       new vscode.NotebookCellOutput([
//         vscode.NotebookCellOutputItem.text(JSON.stringify(res.result)),
//         // vscode.NotebookCellOutputItem.json(res.result)
//       ])
//     ]);
//     execution.end(true, Date.now());
//   }
// }

// function postJSON(chunk: any, path = '/'): Promise<any> {
//   const opts: http.RequestOptions = {
//     host: '127.0.0.1',
//     port: 8080,
//     method: 'POST',
//     path,
//     headers: {
//       'Content-Type': 'application/json',
//     }
//   };
//   return new Promise((resolve, reject) => {
//     const clientReq = http.request(opts, (res) => {
//       if (res.statusCode != 200) {
//       }
//       res.setEncoding('utf8');
//       let rawData = '';
//       res.on('data', (chunk: string) => {
//         rawData += chunk;
//       });
//       res.on('end', () => {
//         const obj = JSON.parse(rawData);
//         resolve(obj);
//       });
//     });
//     clientReq.on('error', (e) => {
//     });
//     const json = JSON.stringify(chunk);
//     clientReq.write(json);
//     clientReq.end();
//   });
// }

// export async function debugCell(cell: vscode.NotebookCell, cellToFileMap: Map<string, string>, fileToCellMap: Map<string, vscode.NotebookCell>) {
//   const path = await createFile();
//   await debug(path);

//   async function createFile() {
//     const text = `require "debug/session";DEBUGGER__.open_tcp(port: 12345)\n` + cell.document.getText();
//     const body = { text };
//     const res = await postJSON(body, '/files');
//     cellToFileMap.set(cell.document.uri.toString(), res.path);
//     fileToCellMap.set(res.path, cell);
//     return res.path;
//   }

//   async function debug(path: string) {
//     const res = await postJSON({ path }, '/debug');
//     const sleep = (time: number) => {
//       return new Promise<void>((resolve, reject) => {
//         setTimeout(() => {
//           resolve();
//         }, time);
//       });
//     };
//     await sleep(3000);
//     const c = {
//       type: "rdbg",
//       name: "Attach with rdbg (tcp 12345)",
//       request: "attach",
//       debugPort: "localhost:12345",
//       internalConsoleOptions: false,
//     };
//     vscode.debug.startDebugging(undefined, c);
//   }
// }

// export function hookWillSendMessages(message: any) {

// }

// export class RdbgDebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
//   constructor(private readonly cellToFileMap: Map<string, string>, private readonly fileToCellMap: Map<string, vscode.NotebookCell>) { }
//   createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
//     return {
//       onWillReceiveMessage: (message: any) => {
//         hookSource(message, (source) => {
//           if (source && source.path) {
//             const file = this.cellToFileMap.get(source.path);
//             if (file) {
//               source.path = file;
//             }
//           }
//         });
//       },
//       onDidSendMessage: (message: any) => {
//         hookSource(message, (source) => {
//           if (source && source.path && source.name) {
//             const cell = this.fileToCellMap.get(source.path);
//             if (cell) {
//               source.path = cell.document.uri.toString();
//               source.name = path.basename(cell.document.uri.path);
//             }
//           }
//         });
//       }
//     };
//   }
// }

// function hookSource(message: DebugProtocol.ProtocolMessage, hook: (source: DebugProtocol.Source | undefined) => void) {
//   switch (message.type) {
//     case "request":
//       const req = message as DebugProtocol.Request;
//       switch (req.command) {
//         case "setBreakpoints":
//           const sbr = req as DebugProtocol.SetBreakpointsRequest;
//           hook(sbr.arguments.source);
//           break;
//         case "source":
//           const sr = req as DebugProtocol.SourceRequest;
//           hook(sr.arguments.source);
//           break;
//       }
//       break;
//     case "event":
//       const evt = message as DebugProtocol.Event;
//       switch (evt.event) {
//         case "loadedSource":
//           const lse = evt as DebugProtocol.LoadedSourceEvent;
//           hook(lse.body.source);
//           break;
//       }
//       break;
//     case "response":
//       const res = message as DebugProtocol.Response;
//       switch (res.command) {
//         case "stackTrace":
//           const str = res as DebugProtocol.StackTraceResponse;
//           str.body.stackFrames.forEach((frame) => {
//             hook(frame.source);
//           });
//           break;
//       }
//       break;
//   }
// }
