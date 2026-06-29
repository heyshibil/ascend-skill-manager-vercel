import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { AppError } from "../../middlewares/error.middleware.js";
import type {
  CompilerResult,
  LambdaResponse,
  RunCodeResult,
  TestCase,
} from "../../types/index.js";
import {
  parseOutputValue,
  isDeepEqual,
} from "../../utils/normalizeOutput.js";

// -- AWS Lambda Client --
const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Lambda function registry
const LAMBDA_FUNCTIONS: Record<string, string> = {
  javascript: process.env.LAMBDA_FUNCTION_NAME!,
  python: process.env.LAMBDA_PYTHON_FUNCTION_NAME!,
};

const CODE_TIMEOUT_MS = 5000;

// Resolve lambda function name from runtime
const resolveLambdaName = (runtime: string): string => {
  const fn = LAMBDA_FUNCTIONS[runtime];

  if (!fn) {
    throw new AppError(`Unsupported runtime: ${runtime}`, 400);
  }

  return fn;
};

// -- Invoke Lambda --
// Sends JS code to Lambda executor and returns stdout/stderr

const invokeLambda = async (
  code: string,
  runtime: string,
): Promise<LambdaResponse> => {
  const functionName = resolveLambdaName(runtime);

  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: "RequestResponse",
    Payload: Buffer.from(JSON.stringify({ code, timeoutMs: CODE_TIMEOUT_MS })),
  });

  const response = await lambdaClient.send(command);

  if (response.FunctionError) {
    const errorPayload = response.Payload
      ? JSON.parse(Buffer.from(response.Payload).toString())
      : {};
    console.error("Lambda function error:", errorPayload);
    throw new AppError("Code execution service error", 502);
  }

  if (!response.Payload) {
    throw new AppError("Empty response from code executor", 502);
  }

  return JSON.parse(Buffer.from(response.Payload).toString());
};

// -- Compose Executable Code --
// Combines user code with all test case invocations into a single

// Compose JS code
const composeJsTestScript = (
  userCode: string,
  testCases: TestCase[],
): string => {
  const testRunner = testCases
    .map(
      (tc) =>
        `try { const __r = ${tc.input}; console.log(typeof __r === "object" ? JSON.stringify(__r) : String(__r)); } catch(e) { console.log("__EXEC_ERROR__"); }`,
    )
    .join("\n");
  return `${userCode}\n\n${testRunner}`;
};

// Compose Py code
const composePyTestScript = (
  userCode: string,
  testCases: TestCase[],
): string => {
  const imports = `import json\n`;
  const testRunner = testCases
    .map(
      (tc) =>
        `try:\n    __r = ${tc.input}\n    print(json.dumps(__r) if isinstance(__r, (list, dict)) else __r)\nexcept Exception:\n    print("__EXEC_ERROR__")`,
    )
    .join("\n");
  return `${imports}${userCode}\n\n${testRunner}`;
};

const composeTestScript = (
  userCode: string,
  testCases: TestCase[],
  runtime: string,
): string => {
  switch (runtime) {
    case "javascript":
      return composeJsTestScript(userCode, testCases);
    case "python":
      return composePyTestScript(userCode, testCases);
    default:
      return composeJsTestScript(userCode, testCases);
  }
};

// -- Lambda Public API --
export const executeCodeTest = async (
  userCode: string,
  testCases: TestCase[],
  _validationScript: string,
  runtime: string,
): Promise<CompilerResult> => {
  if (!testCases || testCases.length === 0) {
    console.warn("WARNING: Code question executed with ZERO test cases!");
    return { compilerScore: 0, passedCases: 0, totalCases: 0 };
  }

  // compose full script
  const fullCode = composeTestScript(userCode, testCases, runtime);

  const result = await invokeLambda(fullCode, runtime);

  // Handle timeout
  if (result.timedOut) {
    console.warn("Code execution timed out for user submission");
    return { compilerScore: 0, passedCases: 0, totalCases: testCases.length };
  }

  if (result.stdout) console.log(result.stdout);

  // Parse results
  const outputLines = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let passedCases = 0;
  for (let i = 0; i < testCases.length; i++) {
    const actualVal = parseOutputValue(outputLines[i] || "");
    const expectedVal = parseOutputValue(testCases[i]?.output || "");
    if (isDeepEqual(actualVal, expectedVal)) {
      passedCases++;
    }
  }

  // Score ?/50
  const percentagePassed = passedCases / testCases.length;
  const compilerScore = percentagePassed * 50;

  return { compilerScore, passedCases, totalCases: testCases.length };
};

// Run code test
export const runCodeTest = async (
  userCode: string,
  testCases: TestCase[],
  runtime: string,
): Promise<RunCodeResult> => {
  if (!testCases || testCases.length === 0) {
    return { passedCases: 0, totalCases: 0, results: [], timedOut: false };
  }

  const fullCode = composeTestScript(userCode, testCases, runtime);
  const result = await invokeLambda(fullCode, runtime);

  if (result.timedOut) {
    return {
      passedCases: 0,
      totalCases: testCases.length,
      results: testCases.map((tc) => ({
        input: tc.input,
        expected: tc.output,
        actual: "⏱ Timed out",
        passed: false,
      })),
      timedOut: true,
    };
  }

  const outputLines = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let passedCases = 0;

  // validate actual outputs and expected outputs
  const results = testCases.map((tc, i) => {
    const actualVal = parseOutputValue(outputLines[i] || "");
    const expectedVal = parseOutputValue(tc.output || "");
    const passed = isDeepEqual(actualVal, expectedVal);
    if (passed) passedCases++;
    return {
      input: tc.input,
      expected: tc.output,
      actual: outputLines[i] || "(no output)",
      passed,
    };
  });

  return {
    passedCases,
    totalCases: testCases.length,
    results,
    timedOut: false,
  };
};
