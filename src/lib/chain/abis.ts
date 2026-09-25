const SPEND_PERMISSION_COMPONENTS = [
  { name: "account", type: "address" },
  { name: "spender", type: "address" },
  { name: "token", type: "address" },
  { name: "allowance", type: "uint160" },
  { name: "period", type: "uint48" },
  { name: "start", type: "uint48" },
  { name: "end", type: "uint48" },
  { name: "salt", type: "uint256" },
  { name: "extraData", type: "bytes" },
] as const;

const SP_TUPLE = { name: "spendPermission", type: "tuple", components: SPEND_PERMISSION_COMPONENTS } as const;

export const MANAGER_ABI = [
  { name: "getHash", type: "function", stateMutability: "view", inputs: [SP_TUPLE], outputs: [{ type: "bytes32" }] },
  { name: "isApproved", type: "function", stateMutability: "view", inputs: [SP_TUPLE], outputs: [{ type: "bool" }] },
  { name: "isRevoked", type: "function", stateMutability: "view", inputs: [SP_TUPLE], outputs: [{ type: "bool" }] },
  {
    name: "getCurrentPeriod", type: "function", stateMutability: "view", inputs: [SP_TUPLE],
    outputs: [{ type: "tuple", components: [{ name: "start", type: "uint48" }, { name: "end", type: "uint48" }, { name: "spend", type: "uint160" }] }],
  },
  { name: "approveWithSignature", type: "function", stateMutability: "nonpayable", inputs: [SP_TUPLE, { name: "signature", type: "bytes" }], outputs: [{ type: "bool" }] },
  {
    name: "SpendPermissionApproved", type: "event",
    inputs: [{ name: "hash", type: "bytes32", indexed: true }, { name: "spendPermission", type: "tuple", indexed: false, components: SPEND_PERMISSION_COMPONENTS }],
  },
] as const;

export const SELLER_ABI = [
  {
    name: "sell", type: "function", stateMutability: "nonpayable",
    inputs: [
      SP_TUPLE,
      { name: "signature", type: "bytes" },
      { name: "needsApprove", type: "bool" },
      { name: "amount", type: "uint160" },
      { name: "minEthOut", type: "uint256" },
      { name: "fee", type: "uint24" },
    ],
    outputs: [{ name: "ethOut", type: "uint256" }],
  },
  { name: "operator", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    name: "Sold", type: "event",
    inputs: [
      { name: "permissionHash", type: "bytes32", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amountIn", type: "uint256", indexed: false },
      { name: "ethOut", type: "uint256", indexed: false },
    ],
  },
  { name: "NotOperator", type: "error", inputs: [] },
  { name: "WrongSpender", type: "error", inputs: [] },
  { name: "ApproveFailed", type: "error", inputs: [] },
  { name: "NoPriceFloor", type: "error", inputs: [] },
  { name: "EthTransferFailed", type: "error", inputs: [] },
  { name: "UnexpectedEth", type: "error", inputs: [] },
] as const;

/** Errors the SpendPermissionManager can raise, for decoding reverts. */
export const MANAGER_ERRORS_ABI = [
  { name: "ExceededSpendPermission", type: "error", inputs: [{ name: "value", type: "uint256" }, { name: "allowance", type: "uint256" }] },
  { name: "UnauthorizedSpendPermission", type: "error", inputs: [] },
  { name: "BeforeSpendPermissionStart", type: "error", inputs: [{ name: "currentTimestamp", type: "uint48" }, { name: "start", type: "uint48" }] },
  { name: "AfterSpendPermissionEnd", type: "error", inputs: [{ name: "currentTimestamp", type: "uint48" }, { name: "end", type: "uint48" }] },
] as const;

export const ERC20_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
  {
    name: "Transfer", type: "event",
    inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }],
  },
] as const;

export const POOL_ABI = [
  {
    name: "slot0", type: "function", stateMutability: "view", inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" }, { name: "tick", type: "int24" }, { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" }, { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" }, { name: "unlocked", type: "bool" },
    ],
  },
  { name: "liquidity", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint128" }] },
  { name: "token0", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    name: "Swap", type: "event",
    inputs: [
      { name: "sender", type: "address", indexed: true }, { name: "recipient", type: "address", indexed: true },
      { name: "amount0", type: "int256", indexed: false }, { name: "amount1", type: "int256", indexed: false },
      { name: "sqrtPriceX96", type: "uint160", indexed: false }, { name: "liquidity", type: "uint128", indexed: false },
      { name: "tick", type: "int24", indexed: false },
    ],
  },
] as const;

export const QUOTER_ABI = [
  {
    name: "quoteExactInputSingle", type: "function", stateMutability: "nonpayable",
    inputs: [{
      name: "params", type: "tuple", components: [
        { name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "amountIn", type: "uint256" },
        { name: "fee", type: "uint24" }, { name: "sqrtPriceLimitX96", type: "uint160" },
      ],
    }],
    outputs: [
      { name: "amountOut", type: "uint256" }, { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" }, { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;
