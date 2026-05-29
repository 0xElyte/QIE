# 🎮 Q.I.A Unity Game Client — Complete Build Guide
## From Zero to WebGL Shooter with Blockchain Score Submission

---

## 📋 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Unity Project Setup](#2-unity-project-setup)
3. [Scene Structure](#3-scene-structure)
4. [Core Game Systems](#4-core-game-systems)
5. [ThirdWeb Wallet Integration](#5-thirdweb-wallet-integration)
6. [Score Signing & Blockchain Submission](#6-score-signing--blockchain-submission)
7. [Supabase Realtime Score Sync](#7-supabase-realtime-score-sync)
8. [WebGL Template & iframe Bridge](#8-webgl-template--iframe-bridge)
9. [Build & Deploy](#9-build--deploy)
10. [Integration Checklist](#10-integration-checklist)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Unity WebGL Game Client                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Game Logic   │  │  Web3 Layer  │  │   Network Layer        │ │
│  │              │  │              │  │                        │ │
│  │ • Spawner    │  │ • ThirdWeb   │  │ • Supabase Client      │ │
│  │ • HitDetect  │  │ • ScoreSign  │  │ • Realtime Score Push  │ │
│  │ • ScoreMgr   │  │ • WalletAuth │  │ • Match State Sync     │ │
│  │ • Timer      │  │              │  │                        │ │
│  │ • Tiebreaker │  │              │  │                        │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         │                 │                       │              │
│         └─────────┬───────┘                       │              │
│                   │                               │              │
│          ┌────────▼────────┐                      │              │
│          │  Bridge Layer   │                      │              │
│          │  (postMessage)  │◄─────────────────────┘              │
│          │                 │                                     │
│          │ Unity ↔ React   │                                     │
│          │ iframe bridge   │                                     │
│          └─────────────────┘                                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Unity UI (Canvas)                                        │   │
│  │  • HUD: Score, Timer, Health                              │   │
│  │  • Match Result Panel                                     │   │
│  │  • Practice Mode Menu                                     │   │
│  │  • Countdown Overlay                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐         ┌─────────────────────┐
│  QIE Testnet    │         │  Supabase           │
│  (Chain 1983)   │         │  (Realtime DB)      │
│                 │         │                     │
│  submitFinal    │         │  live_scores table  │
│  Score()        │         │  (pushed every 1s)  │
└─────────────────┘         └─────────────────────┘
```

---

## 2. Unity Project Setup

### Prerequisites
- **Unity 2022.3 LTS** (or 2023.x) with WebGL Build Support module installed
- **ThirdWeb Unity SDK v3+**: https://github.com/thirdweb-dev/unity-sdk/releases
- **Newtonsoft JSON** (included with Unity 2020+)

### Step-by-step Setup

```
1. Open Unity Hub → New Project → 3D (URP) template
2. Project Name: "QIA-GameClient"
3. Location: /path/to/QIE/game-client/
4. Switch platform to WebGL:
   File → Build Settings → WebGL → Switch Platform
```

### Install ThirdWeb SDK
```
1. Download latest .unitypackage from:
   https://github.com/thirdweb-dev/unity-sdk/releases
2. Assets → Import Package → Custom Package → select .unitypackage
3. Import All
4. ThirdWeb should appear in the menu bar
```

### Project Settings (Critical for WebGL)
```
Edit → Project Settings → Player → WebGL:

Resolution and Presentation:
  - Default Canvas Width: 1280
  - Default Canvas Height: 720
  - Run In Background: ✅

Publishing Settings:
  - Compression Format: Brotli (smallest build)
  - Decompression Fallback: ✅ (for older browsers)

Other Settings:
  - Color Space: Linear
  - Auto Graphics API: ✅ (uses WebGL 2.0)
  - Strip Engine Code: ✅ (smaller build)
  - IL2CPP Code Generation: Faster (smaller) Builds
```

### Folder Structure (inside Unity Assets/)
```
Assets/
├── Scripts/
│   ├── Core/
│   │   ├── GameManager.cs          # Master game controller
│   │   ├── MatchConfig.cs          # Match settings (duration, bet, players)
│   │   ├── TargetSpawner.cs        # Spawns MEV predator targets
│   │   ├── Target.cs               # Individual target behavior
│   │   ├── HitDetection.cs         # Raycast hit detection
│   │   ├── ScoreManager.cs         # Score tracking + multiplier
│   │   ├── MatchTimer.cs           # Countdown timer
│   │   └── TiebreakerManager.cs   # Tiebreaker round logic
│   ├── Web3/
│   │   ├── WalletManager.cs        # ThirdWeb wallet connection
│   │   ├── ScoreSigner.cs          # ECDSA score signing
│   │   └── ContractCaller.cs       # submitFinalScore() call
│   ├── Network/
│   │   ├── SupabaseClient.cs       # REST API client for Supabase
│   │   └── ScoreSyncService.cs     # Pushes scores every 1s
│   ├── UI/
│   │   ├── HUDController.cs        # In-game HUD
│   │   ├── CountdownUI.cs          # 3-2-1-GO overlay
│   │   ├── ResultPanel.cs          # Win/Lose/Tie screen
│   │   └── PracticeMenu.cs         # Practice mode settings
│   └── Bridge/
│       ├── IframeBridge.cs         # postMessage Unity↔React
│       └── GameMessage.cs          # Message protocol types
├── Prefabs/
│   ├── Targets/
│   │   ├── MEVBot.prefab           # Basic target (10 pts)
│   │   ├── SandwichAttack.prefab   # Fast target (25 pts)
│   │   ├── Frontrunner.prefab      # Armored target (50 pts)
│   │   └── FlashLoan.prefab        # Boss target (100 pts)
│   ├── Effects/
│   │   ├── HitEffect.prefab        # Hit particle
│   │   ├── DestroyEffect.prefab    # Explosion
│   │   └── ComboText.prefab        # Floating score text
│   └── UI/
│       ├── HUD.prefab
│       ├── Countdown.prefab
│       └── ResultPanel.prefab
├── Materials/
│   ├── Cyberpunk/
│   │   ├── NeonGreen.mat
│   │   ├── DarkGrid.mat
│   │   └── Hologram.mat
│   └── Targets/
│       ├── Red.mat
│       ├── Orange.mat
│       └── Purple.mat
├── Scenes/
│   ├── MainMenu.unity              # Practice mode entry
│   ├── Competition.unity           # Main match scene
│   └── Tiebreaker.unity            # Tiebreaker round
├── WebGLTemplates/
│   └── QIA/                        # Custom WebGL template
│       ├── index.html
│       └── style.css
├── StreamingAssets/
│   └── config.json                 # Runtime config (chain, contract)
└── Plugins/
    └── Supabase/
        └── SupabaseRest.cs         # Lightweight REST client
```

---

## 3. Scene Structure

### Scene: Competition.unity

```
Hierarchy:
├── --- MANAGERS ---
│   ├── GameManager (GameManager.cs)
│   ├── MatchConfig (MatchConfig.cs)
│   ├── ScoreManager (ScoreManager.cs)
│   ├── MatchTimer (MatchTimer.cs)
│   ├── TargetSpawner (TargetSpawner.cs)
│   ├── IframeBridge (IframeBridge.cs)
│   └── ScoreSyncService (ScoreSyncService.cs)
│
├── --- ENVIRONMENT ---
│   ├── Arena (3D model / procedural)
│   ├── Lighting
│   │   ├── Directional Light
│   │   ├── Neon Point Lights (green, blue)
│   │   └── Volume (Post-processing)
│   └── Skybox (dark cyberpunk)
│
├── --- PLAYER ---
│   ├── PlayerController (FPS controller)
│   ├── Camera
│   │   └── Crosshair (UI overlay)
│   └── Weapon
│       └── RaycastGun (HitDetection.cs)
│
├── --- SPAWN SYSTEM ---
│   ├── SpawnPoint1 (Transform)
│   ├── SpawnPoint2 (Transform)
│   ├── SpawnPoint3 (Transform)
│   └── ... (8-12 spawn points around arena)
│
├── --- UI (Canvas - Screen Space Overlay) ---
│   ├── HUD
│   │   ├── ScoreDisplay (TextMeshPro)
│   │   ├── TimerDisplay (TextMeshPro)
│   │   ├── ComboCounter (TextMeshPro)
│   │   ├── Crosshair (Image)
│   │   └── HealthBar (Slider) [optional]
│   ├── CountdownOverlay
│   │   └── CountdownText (TextMeshPro)
│   └── ResultPanel (initially disabled)
│       ├── ResultTitle ("YOU WIN" / "YOU LOSE")
│       ├── FinalScore
│       ├── SubmitButton
│       └── BackToLobbyButton
│
└── --- AUDIO ---
    ├── BGM (Ambient cyberpunk loop)
    ├── SFX_Hit
    ├── SFX_Destroy
    ├── SFX_Miss
    └── SFX_Countdown
```

---

## 4. Core Game Systems

### GameManager.cs — Master Controller

```csharp
using UnityEngine;
using System;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("References")]
    public MatchConfig matchConfig;
    public ScoreManager scoreManager;
    public MatchTimer matchTimer;
    public TargetSpawner targetSpawner;
    public IframeBridge bridge;

    public enum GameState
    {
        Initializing,
        Countdown,
        Playing,
        Paused,
        Finished,
        Tiebreaker
    }

    public GameState CurrentState { get; private set; }
    public event Action<GameState> OnStateChanged;

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
    }

    void Start()
    {
        // Wait for IframeBridge to receive config from React
        CurrentState = GameState.Initializing;
    }

    public void InitializeMatch(MatchConfig config)
    {
        matchConfig = config;
        StartCountdown();
    }

    void StartCountdown()
    {
        CurrentState = GameState.Countdown;
        OnStateChanged?.Invoke(CurrentState);
        StartCoroutine(CountdownCoroutine());
    }

    System.Collections.IEnumerator CountdownCoroutine()
    {
        // 3... 2... 1... GO!
        for (int i = 3; i > 0; i--)
        {
            bridge.SendMessage(new GameMessage
            {
                type = "COUNTDOWN_TICK",
                payload = new { tick = i }
            });
            yield return new WaitForSeconds(1f);
        }

        StartMatch();
    }

    void StartMatch()
    {
        CurrentState = GameState.Playing;
        OnStateChanged?.Invoke(CurrentState);
        matchTimer.StartTimer(matchConfig.durationSeconds);
        targetSpawner.StartSpawning();
        scoreManager.Reset();

        bridge.SendMessage(new GameMessage
        {
            type = "COUNTDOWN_COMPLETE"
        });
    }

    public void EndMatch()
    {
        CurrentState = GameState.Finished;
        OnStateChanged?.Invoke(CurrentState);
        targetSpawner.StopSpawning();

        int finalScore = scoreManager.CurrentScore;

        bridge.SendMessage(new GameMessage
        {
            type = "GAME_OVER",
            payload = new { score = finalScore }
        });
    }

    // Called by IframeBridge when React requests score signing
    public void RequestScoreSign()
    {
        int score = scoreManager.CurrentScore;
        ScoreSigner.Instance.SignAndSubmit(score, matchConfig.matchId);
    }
}
```

### MatchConfig.cs

```csharp
using UnityEngine;

[System.Serializable]
public class MatchConfig
{
    public int matchId;
    public string playerAddress;
    public string opponentAddress;
    public int durationSeconds;
    public ulong betAmountWei;
    public bool isSpectator;
    public bool isPracticeMode;

    public static MatchConfig FromJson(string json)
    {
        return JsonUtility.FromJson<MatchConfig>(json);
    }
}
```

### TargetSpawner.cs

```csharp
using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class TargetSpawner : MonoBehaviour
{
    [Header("Spawn Settings")]
    public Transform[] spawnPoints;
    public float baseSpawnInterval = 2f;
    public float minSpawnInterval = 0.3f;

    [Header("Target Prefabs")]
    public GameObject mevBotPrefab;        // 10 pts, slow, large
    public GameObject sandwichPrefab;      // 25 pts, medium speed
    public GameObject frontrunnerPrefab;   // 50 pts, fast, small
    public GameObject flashLoanPrefab;     // 100 pts, rare, tiny, fast

    [Header("Difficulty Scaling")]
    public float difficultyRampRate = 0.02f; // per second

    private bool isSpawning;
    private float elapsedTime;
    private List<GameObject> activeTargets = new List<GameObject>();

    // Target type weights (probability distribution)
    private float[] weights = { 0.50f, 0.30f, 0.15f, 0.05f };

    public void StartSpawning()
    {
        isSpawning = true;
        elapsedTime = 0f;
        StartCoroutine(SpawnLoop());
    }

    public void StopSpawning()
    {
        isSpawning = false;
        StopAllCoroutines();
        // Destroy remaining targets
        foreach (var t in activeTargets)
        {
            if (t != null) Destroy(t);
        }
        activeTargets.Clear();
    }

    IEnumerator SpawnLoop()
    {
        while (isSpawning)
        {
            float interval = Mathf.Max(
                minSpawnInterval,
                baseSpawnInterval - (elapsedTime * difficultyRampRate)
            );

            yield return new WaitForSeconds(interval);

            SpawnTarget();
            elapsedTime += interval;
        }
    }

    void SpawnTarget()
    {
        // Pick random spawn point
        Transform point = spawnPoints[Random.Range(0, spawnPoints.Length)];

        // Pick target type by weighted random
        GameObject prefab = PickTargetPrefab();

        // Slight random offset from spawn point
        Vector3 offset = Random.insideUnitSphere * 0.5f;
        offset.y = Mathf.Abs(offset.y); // Always above ground

        GameObject target = Instantiate(prefab, point.position + offset,
            Quaternion.Euler(0, Random.Range(0, 360), 0));

        activeTargets.Add(target);

        // Auto-destroy after lifetime
        float lifetime = Random.Range(3f, 8f);
        Destroy(target, lifetime);
    }

    GameObject PickTargetPrefab()
    {
        float roll = Random.value;
        float cumulative = 0f;

        cumulative += weights[0]; if (roll < cumulative) return mevBotPrefab;
        cumulative += weights[1]; if (roll < cumulative) return sandwichPrefab;
        cumulative += weights[2]; if (roll < cumulative) return frontrunnerPrefab;
        return flashLoanPrefab;
    }
}
```

### ScoreManager.cs

```csharp
using UnityEngine;
using System;

public class ScoreManager : MonoBehaviour
{
    public int CurrentScore { get; private set; }
    public int ComboMultiplier { get; private set; } = 1;
    public int MaxCombo { get; private set; }

    private float comboTimer;
    private const float COMBO_WINDOW = 2f; // seconds to maintain combo

    public event Action<int> OnScoreChanged;
    public event Action<int> OnComboChanged;

    void Update()
    {
        // Decay combo if no hits
        if (ComboMultiplier > 1)
        {
            comboTimer -= Time.deltaTime;
            if (comboTimer <= 0)
            {
                ComboMultiplier = 1;
                OnComboChanged?.Invoke(ComboMultiplier);
            }
        }
    }

    public void AddScore(int basePoints)
    {
        int points = basePoints * ComboMultiplier;
        CurrentScore += points;

        // Refresh combo
        comboTimer = COMBO_WINDOW;
        ComboMultiplier = Mathf.Min(ComboMultiplier + 1, 10); // Max 10x
        MaxCombo = Mathf.Max(MaxCombo, ComboMultiplier);

        OnScoreChanged?.Invoke(CurrentScore);
        OnComboChanged?.Invoke(ComboMultiplier);
    }

    public void Reset()
    {
        CurrentScore = 0;
        ComboMultiplier = 1;
        MaxCombo = 0;
        OnScoreChanged?.Invoke(0);
        OnComboChanged?.Invoke(1);
    }
}
```

### Target.cs

```csharp
using UnityEngine;

public class Target : MonoBehaviour
{
    [Header("Target Properties")]
    public int pointValue = 10;
    public float moveSpeed = 2f;
    public float health = 1f;

    [Header("Visual")]
    public GameObject destroyEffectPrefab;

    private Vector3 moveDirection;
    private ScoreManager scoreManager;

    void Start()
    {
        scoreManager = ScoreManager.Instance;

        // Random movement direction
        moveDirection = new Vector3(
            Random.Range(-1f, 1f), 0, Random.Range(-1f, 1f)
        ).normalized;

        // Slight bobbing
        StartCoroutine(BobAnimation());
    }

    void Update()
    {
        // Move target
        transform.position += moveDirection * moveSpeed * Time.deltaTime;

        // Bounce off invisible walls (simple arena bounds)
        if (Mathf.Abs(transform.position.x) > 10f)
            moveDirection.x *= -1;
        if (Mathf.Abs(transform.position.z) > 10f)
            moveDirection.z *= -1;
    }

    public void OnHit(float damage)
    {
        health -= damage;
        if (health <= 0)
        {
            OnDestroyed();
        }
    }

    void OnDestroyed()
    {
        // Add score
        scoreManager.AddScore(pointValue);

        // Spawn effect
        if (destroyEffectPrefab != null)
        {
            Instantiate(destroyEffectPrefab, transform.position,
                Quaternion.identity);
        }

        // Audio
        AudioManager.Instance?.PlaySFX("Hit");

        Destroy(gameObject);
    }

    System.Collections.IEnumerator BobAnimation()
    {
        float startY = transform.position.y;
        float elapsed = 0;
        while (true)
        {
            elapsed += Time.deltaTime;
            transform.position = new Vector3(
                transform.position.x,
                startY + Mathf.Sin(elapsed * 2f) * 0.3f,
                transform.position.z
            );
            yield return null;
        }
    }
}
```

### HitDetection.cs (Raycast Shooting)

```csharp
using UnityEngine;

public class HitDetection : MonoBehaviour
{
    [Header("Weapon Settings")]
    public float range = 100f;
    public float fireRate = 0.1f; // seconds between shots
    public LayerMask targetLayer;
    public int damage = 1;

    [Header("Effects")]
    public ParticleSystem muzzleFlash;
    public LineRenderer bulletTrail;
    public Camera playerCamera;

    private float nextFireTime;

    void Update()
    {
        if (GameManager.Instance.CurrentState != GameManager.GameState.Playing)
            return;

        // Fire on left click or touch
        if ((Input.GetMouseButtonDown(0) || Input.touchCount > 0)
            && Time.time >= nextFireTime)
        {
            Fire();
            nextFireTime = Time.time + fireRate;
        }
    }

    void Fire()
    {
        // Muzzle flash
        muzzleFlash?.Play();

        // Raycast from camera center
        Ray ray = playerCamera.ScreenPointToRay(
            new Vector3(Screen.width / 2f, Screen.height / 2f, 0)
        );

        if (Physics.Raycast(ray, out RaycastHit hit, range, targetLayer))
        {
            Target target = hit.collider.GetComponent<Target>();
            if (target != null)
            {
                target.OnHit(damage);

                // Spawn hit effect at impact point
                AudioManager.Instance?.PlaySFX("Hit");
            }
        }

        // Bullet trail visual
        if (bulletTrail != null)
        {
            StartCoroutine(ShowTrail(ray.origin,
                hit.point != Vector3.zero ? hit.point
                : ray.origin + ray.direction * range));
        }
    }

    System.Collections.IEnumerator ShowTrail(Vector3 start, Vector3 end)
    {
        bulletTrail.SetPosition(0, start);
        bulletTrail.SetPosition(1, end);
        bulletTrail.enabled = true;
        yield return new WaitForSeconds(0.05f);
        bulletTrail.enabled = false;
    }
}
```

### MatchTimer.cs

```csharp
using UnityEngine;
using System;

public class MatchTimer : MonoBehaviour
{
    public float TimeRemaining { get; private set; }
    public bool IsRunning { get; private set; }

    public event Action<float> OnTimeUpdated;
    public event Action OnTimeExpired;

    void Update()
    {
        if (!IsRunning) return;

        TimeRemaining -= Time.deltaTime;
        OnTimeUpdated?.Invoke(TimeRemaining);

        if (TimeRemaining <= 0)
        {
            TimeRemaining = 0;
            IsRunning = false;
            OnTimeExpired?.Invoke();
            GameManager.Instance.EndMatch();
        }
    }

    public void StartTimer(float seconds)
    {
        TimeRemaining = seconds;
        IsRunning = true;
    }

    public void StopTimer()
    {
        IsRunning = false;
    }
}
```

---

## 5. ThirdWeb Wallet Integration

### WalletManager.cs

```csharp
using UnityEngine;
using Thirdweb;
using System.Threading.Tasks;

public class WalletManager : MonoBehaviour
{
    public static WalletManager Instance { get; private set; }

    private ThirdwebSDK sdk;
    public string ConnectedAddress { get; private set; }
    public bool IsConnected => !string.IsNullOrEmpty(ConnectedAddress);

    // QIE Testnet chain config
    private const int QIE_CHAIN_ID = 1983;
    private const string QIE_RPC = "https://rpc1testnet.qie.digital/";

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    void Start()
    {
        // ThirdWeb auto-connects if wallet was previously connected
        // in the browser (uses injected provider)
        InitializeSDK();
    }

    void InitializeSDK()
    {
        sdk = ThirdwebManager.Instance.SDK;

        // Set active chain to QIE testnet
        // (Configured in ThirdWeb SDK settings in Unity Editor)
    }

    public async Task<string> GetAddress()
    {
        if (!string.IsNullOrEmpty(ConnectedAddress))
            return ConnectedAddress;

        try
        {
            var wallet = sdk.Wallet;
            ConnectedAddress = await wallet.GetAddress();
            return ConnectedAddress;
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Wallet connection failed: {e.Message}");
            return null;
        }
    }

    public async Task<string> SignMessage(string message)
    {
        var wallet = sdk.Wallet;
        return await wallet.SignMessage(message);
    }

    // Get contract instance
    public Contract GetContract(string address, string abi = "[]")
    {
        return sdk.GetContract(address, abi);
    }
}
```

---

## 6. Score Signing & Blockchain Submission

### ScoreSigner.cs

```csharp
using UnityEngine;
using System;
using System.Threading.Tasks;
using Thirdweb;
using System.Text;

public class ScoreSigner : MonoBehaviour
{
    public static ScoreSigner Instance { get; private set; }

    // Contract address (loaded from config)
    private string lobbyAddress;

    // ABI for submitFinalScore
    private const string LOBBY_ABI = @"[
        {
            ""inputs"": [
                {""name"": ""matchId"", ""type"": ""uint256""},
                {""name"": ""finalScore"", ""type"": ""uint256""},
                {""name"": ""metadataHash"", ""type"": ""bytes32""},
                {""name"": ""signature"", ""type"": ""bytes""}
            ],
            ""name"": ""submitFinalScore"",
            ""outputs"": [],
            ""stateMutability"": ""nonpayable"",
            ""type"": ""function""
        }
    ]";

    void Awake()
    {
        Instance = this;
        // Load from StreamingAssets/config.json
        LoadConfig();
    }

    void LoadConfig()
    {
        string configPath = System.IO.Path.Combine(
            Application.streamingAssetsPath, "config.json");
        if (System.IO.File.Exists(configPath))
        {
            string json = System.IO.File.ReadAllText(configPath);
            var config = JsonUtility.FromJson<ContractConfig>(json);
            lobbyAddress = config.lobbyAddress;
        }
    }

    /// <summary>
    /// Sign the score and submit to blockchain.
    /// Called by GameManager when React requests score submission.
    /// </summary>
    public async void SignAndSubmit(int score, int matchId)
    {
        try
        {
            // 1. Generate salt
            byte[] saltBytes = new byte[32];
            UnityEngine.Random.InitState(System.Environment.TickCount);
            for (int i = 0; i < 32; i++)
                saltBytes[i] = (byte)UnityEngine.Random.Range(0, 256);
            string salt = "0x" + BitConverter.ToString(saltBytes)
                .Replace("-", "").ToLower();

            // 2. Compute metadata hash: keccak256(abi.encodePacked(matchId, score, salt))
            // This must match the Solidity/JS hash exactly
            string metadataHash = ComputeMetadataHash(matchId, score, salt);

            // 3. Sign the hash with connected wallet
            string signature = await WalletManager.Instance.SignMessage(
                metadataHash);

            // 4. Send to React via postMessage bridge
            IframeBridge.Instance.SendMessage(new GameMessage
            {
                type = "SCORE_SIGNED",
                payload = new ScorePayload
                {
                    score = score,
                    metadataHash = metadataHash,
                    signature = signature
                }
            });

            Debug.Log($"Score signed: {score}, hash: {metadataHash}");
        }
        catch (Exception e)
        {
            Debug.LogError($"Score signing failed: {e.Message}");
            IframeBridge.Instance.SendMessage(new GameMessage
            {
                type = "GAME_ERROR",
                payload = new { message = $"Signing failed: {e.Message}" }
            });
        }
    }

    /// <summary>
    /// Compute keccak256(abi.encodePacked(uint256, uint256, bytes32))
    /// Must produce identical hash to Solidity and JavaScript versions.
    /// </summary>
    string ComputeMetadataHash(int matchId, int score, string salt)
    {
        // Pack: uint256(matchId) ++ uint256(score) ++ bytes32(salt)
        // Each uint256 is 32 bytes, bytes32 is 32 bytes → 96 bytes total
        byte[] matchIdBytes = ToBigEndianBytes((uint)matchId, 32);
        byte[] scoreBytes = ToBigEndianBytes((uint)score, 32);
        byte[] saltBytes = HexToBytes(salt);

        byte[] packed = new byte[96];
        Buffer.BlockCopy(matchIdBytes, 0, packed, 0, 32);
        Buffer.BlockCopy(scoreBytes, 0, packed, 32, 32);
        Buffer.BlockCopy(saltBytes, 0, packed, 64, 32);

        // keccak256
        byte[] hash = Keccak256(packed);
        return "0x" + BitConverter.ToString(hash).Replace("-", "").ToLower();
    }

    // Keccak256 implementation (use a library like SHA3.Net or BouncyCastle)
    // For MVP: you can also send raw data to JS bridge and let ethers.js hash it
    byte[] Keccak256(byte[] input)
    {
        // Use ThirdWeb's built-in crypto or a Keccak NuGet package
        // Placeholder: in production, use a proper Keccak256 library
        var sha3 = new Org.BouncyCastle.Crypto.Digests.KeccakDigest(256);
        sha3.BlockUpdate(input, 0, input.Length);
        byte[] result = new byte[32];
        sha3.DoFinal(result, 0);
        return result;
    }

    static byte[] ToBigEndianBytes(uint value, int length)
    {
        byte[] bytes = BitConverter.GetBytes(value);
        if (BitConverter.IsLittleEndian) Array.Reverse(bytes);
        // Pad to desired length
        byte[] padded = new byte[length];
        Buffer.BlockCopy(bytes, 0, padded, length - bytes.Length, bytes.Length);
        return padded;
    }

    static byte[] HexToBytes(string hex)
    {
        hex = hex.StartsWith("0x") ? hex[2..] : hex;
        byte[] bytes = new byte[hex.Length / 2];
        for (int i = 0; i < bytes.Length; i++)
            bytes[i] = Convert.ToByte(hex.Substring(i * 2, 2), 16);
        return bytes;
    }

    [Serializable]
    class ScorePayload
    {
        public int score;
        public string metadataHash;
        public string signature;
    }

    [Serializable]
    class ContractConfig
    {
        public string lobbyAddress;
        public string leaderboardAddress;
    }
}
```

---

## 7. Supabase Realtime Score Sync

### SupabaseClient.cs (Lightweight REST Client)

```csharp
using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Text;

public class SupabaseClient : MonoBehaviour
{
    public static SupabaseClient Instance { get; private set; }

    private string supabaseUrl;
    private string supabaseKey;

    void Awake()
    {
        Instance = this;
        // Load from config
        string configPath = System.IO.Path.Combine(
            Application.streamingAssetsPath, "config.json");
        if (System.IO.File.Exists(configPath))
        {
            string json = System.IO.File.ReadAllText(configPath);
            var config = JsonUtility.FromJson<SupabaseConfig>(json);
            supabaseUrl = config.supabaseUrl;
            supabaseKey = config.supabaseKey;
        }
    }

    /// <summary>
    /// Upsert a live score (called every 1 second during active match)
    /// </summary>
    public void UpdateLiveScore(int matchId, string playerAddress, int score)
    {
        StartCoroutine(UpsertScore(matchId, playerAddress, score));
    }

    IEnumerator UpsertScore(int matchId, string playerAddress, int score)
    {
        string url = $"{supabaseUrl}/rest/v1/live_scores";

        string body = JsonUtility.ToJson(new LiveScore
        {
            match_id = matchId,
            player = playerAddress,
            score = score
        });

        using UnityWebRequest request = new UnityWebRequest(url, "POST");
        request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");
        request.SetRequestHeader("apikey", supabaseKey);
        request.SetRequestHeader("Authorization", $"Bearer {supabaseKey}");
        request.SetRequestHeader("Prefer", "resolution=merge-duplicates");

        yield return request.SendWebRequest();

        if (request.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError($"Supabase score sync failed: {request.error}");
        }
    }

    [Serializable]
    class LiveScore
    {
        public int match_id;
        public string player;
        public int score;
    }

    [Serializable]
    class SupabaseConfig
    {
        public string supabaseUrl;
        public string supabaseKey;
    }
}
```

### ScoreSyncService.cs (Pushes scores every 1s)

```csharp
using UnityEngine;
using System.Collections;

public class ScoreSyncService : MonoBehaviour
{
    [Header("Config")]
    public float syncInterval = 1f; // Push score every 1 second

    private ScoreManager scoreManager;
    private MatchConfig matchConfig;
    private string playerAddress;
    private Coroutine syncCoroutine;

    void Start()
    {
        scoreManager = ScoreManager.Instance;
        GameManager.Instance.OnStateChanged += OnStateChanged;
    }

    void OnStateChanged(GameManager.GameState state)
    {
        if (state == GameManager.GameState.Playing)
        {
            matchConfig = GameManager.Instance.matchConfig;
            playerAddress = matchConfig.playerAddress;
            syncCoroutine = StartCoroutine(SyncLoop());
        }
        else if (state == GameManager.GameState.Finished)
        {
            if (syncCoroutine != null) StopCoroutine(syncCoroutine);

            // Push final score one last time
            SupabaseClient.Instance.UpdateLiveScore(
                matchConfig.matchId, playerAddress, scoreManager.CurrentScore
            );
        }
    }

    IEnumerator SyncLoop()
    {
        while (true)
        {
            yield return new WaitForSeconds(syncInterval);

            if (scoreManager != null && matchConfig != null)
            {
                SupabaseClient.Instance.UpdateLiveScore(
                    matchConfig.matchId,
                    playerAddress,
                    scoreManager.CurrentScore
                );
            }
        }
    }

    void OnDestroy()
    {
        if (GameManager.Instance != null)
            GameManager.Instance.OnStateChanged -= OnStateChanged;
    }
}
```

---

## 8. WebGL Template & iframe Bridge

### IframeBridge.cs (Unity → React postMessage)

```csharp
using UnityEngine;
using System.Runtime.InteropServices;
using System;

[Serializable]
public class GameMessage
{
    public string type;
    public object payload;
}

public class IframeBridge : MonoBehaviour
{
    public static IframeBridge Instance { get; private set; }

    // Import JS function for sending messages from Unity → parent
    [DllImport("__Internal")]
    private static extern void SendMessageToParent(string message);

    void Awake()
    {
        Instance = this;
    }

    void Start()
    {
        // Tell React that Unity has loaded
        SendMessage(new GameMessage { type = "UNITY_LOADED" });
    }

    /// <summary>
    /// Send a message from Unity to the parent React window
    /// </summary>
    public void SendMessage(GameMessage msg)
    {
        string json = JsonUtility.ToJson(msg);

#if UNITY_WEBGL && !UNITY_EDITOR
        SendMessageToParent(json);
#else
        Debug.Log($"[Bridge →] {json}");
#endif
    }

    /// <summary>
    /// Called from JavaScript via SendMessage("IframeBridge", "ReceiveMessage", json)
    /// </summary>
    public void ReceiveMessage(string json)
    {
        GameMessage msg = JsonUtility.FromJson<GameMessage>(json);
        Debug.Log($"[Bridge ←] {msg.type}");

        switch (msg.type)
        {
            case "INIT_MATCH":
                HandleInitMatch(msg);
                break;
            case "REQUEST_SCORE_SIGN":
                GameManager.Instance.RequestScoreSign();
                break;
        }
    }

    void HandleInitMatch(GameMessage msg)
    {
        // Parse match config from JSON payload
        string payloadJson = JsonUtility.ToJson(msg.payload);
        MatchConfig config = MatchConfig.FromJson(payloadJson);
        GameManager.Instance.InitializeMatch(config);
    }
}
```

### WebGL Plugin (JavaScript → add to WebGLTemplate)

Create `Assets/WebGLTemplates/QIA/UnitySendMessage.js`:

```javascript
// Called by Unity via DllImport("__Internal")
function SendMessageToParent(message) {
  window.parent.postMessage(JSON.parse(message), "*");
}
```

### Custom WebGL Template: `Assets/WebGLTemplates/QIA/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Q.I.A Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0f;
      overflow: hidden;
    }
    #unity-container {
      width: 100vw;
      height: 100vh;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
    #loading {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0a0a0f;
      color: #00ff88;
      font-family: monospace;
      z-index: 10;
    }
    #loading-bar {
      width: 200px;
      height: 4px;
      background: #1a1a2e;
      border-radius: 2px;
      margin-top: 16px;
      overflow: hidden;
    }
    #loading-fill {
      width: 0%;
      height: 100%;
      background: #00ff88;
      transition: width 0.3s;
    }
  </style>
</head>
<body>
  <div id="loading">
    <p>Loading Q.I.A...</p>
    <div id="loading-bar"><div id="loading-fill"></div></div>
    <p id="loading-status" style="margin-top:8px;font-size:12px;color:#888">
      Initializing...
    </p>
  </div>

  <div id="unity-container">
    <canvas id="unity-canvas" tabindex="-1"></canvas>
  </div>

  <script src="Build/QIA.loader.js"></script>
  <script src="UnitySendMessage.js"></script>
  <script>
    var unityInstance = createUnityInstance(
      document.querySelector("#unity-canvas"),
      {
        dataUrl: "Build/QIA.data",
        frameworkUrl: "Build/QIA.framework.js",
        codeUrl: "Build/QIA.wasm",
        streamingAssetsUrl: "StreamingAssets",
        companyName: "QIA",
        productName: "QIA Game Client",
        productVersion: "0.1.0",
        showBanner: (msg, type) => console.warn(msg),
      },
      (progress) => {
        document.getElementById("loading-fill").style.width =
          (progress * 100) + "%";
        document.getElementById("loading-status").textContent =
          Math.round(progress * 100) + "%";
      }
    ).then((instance) => {
      document.getElementById("loading").style.display = "none";
    });

    // Listen for messages from React parent (when in iframe)
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type) {
        unityInstance.SendMessage(
          "IframeBridge",
          "ReceiveMessage",
          JSON.stringify(event.data)
        );
      }
    });
  </script>
</body>
</html>
```

### Runtime Config: `Assets/StreamingAssets/config.json`

```json
{
  "lobbyAddress": "0x...",
  "leaderboardAddress": "0x...",
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseKey": "eyJ...",
  "chainId": 1983,
  "rpcUrl": "https://rpc1testnet.qie.digital/"
}
```

---

## 9. Build & Deploy

### Build Steps

```
1. File → Build Settings
2. Select WebGL platform
3. Player Settings:
   - WebGL Template: QIA (custom)
   - Compression: Brotli
4. Build
5. Output: /build/ folder with:
   - index.html
   - Build/QIA.data
   - Build/QIA.framework.js
   - Build/QIA.wasm
   - Build/QIA.loader.js
```

### Deploy to Frontend

```bash
# Copy build output to Next.js public directory
cp -r /path/to/build/* /path/to/QIE/frontend/public/game/

# The game is now accessible at:
# http://localhost:3000/game/index.html
```

### Next.js Config (already set up)

```javascript
// next.config.js — COEP headers for SharedArrayBuffer (if needed)
async headers() {
  return [{
    source: "/game/:path*",
    headers: [
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ],
  }];
}
```

### Build Size Optimization

| Technique | Savings |
|-----------|---------|
| Brotli compression | ~60% smaller than Gzip |
| Addressables (lazy-load assets) | Only load needed assets |
| Strip unused engine modules | ~5-10MB savings |
| Crunch compression on textures | ~50% texture size |
| Low-poly models (100-500 tris) | Minimal mesh data |
| Procedural audio (no WAVs) | ~2MB savings |
| **Target total** | **<25MB** |

---

## 10. Integration Checklist

### Pre-Match Flow
```
✅ React lobby → MatchCard → "Open Game" button
✅ Navigate to /game?matchId=123
✅ Page loads Unity iframe at /game/index.html
✅ Unity loads, sends UNITY_LOADED postMessage
✅ React sends INIT_MATCH with matchId, duration, player addresses
✅ Unity receives config, shows 3-2-1 countdown
```

### During Match
```
✅ Targets spawn with increasing difficulty
✅ Player shoots → raycast hit detection → score increments
✅ Score synced to Supabase every 1 second
✅ Spectators see live scores in React via Supabase Realtime
✅ Match timer counts down → GAME_OVER at 0:00
```

### Post-Match
```
✅ Unity sends GAME_OVER {score} to React
✅ React shows "Sign & Submit Score" button
✅ User clicks → React sends REQUEST_SCORE_SIGN to Unity
✅ Unity computes keccak256(matchId, score, salt)
✅ Unity signs hash with wallet (ThirdWeb)
✅ Unity sends SCORE_SIGNED {score, metadataHash, signature} to React
✅ React calls CompetitionLobby.submitFinalScore() on-chain
✅ On-chain: ECDSA recover → verify signer → store score
✅ If both scores submitted → auto-resolve → payouts assigned
✅ React navigates to /match/[id] for claim flow
```

### Key Integration Points (Data Flow)

```
┌─────────────┐   postMessage    ┌──────────────┐   ethers.js     ┌──────────────┐
│   Unity      │ ──────────────→ │   React      │ ──────────────→ │  QIE Chain   │
│   WebGL      │ ←────────────── │   Next.js    │ ←────────────── │              │
└─────────────┘   postMessage    └──────────────┘   events        └──────────────┘
       │                               │
       │ REST API (1s interval)        │ Supabase Realtime
       ▼                               ▼
  ┌──────────────────────────────────────────┐
  │              Supabase                     │
  │   live_scores ──→ matches ──→ leaderboard │
  └──────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| WebGL build fails | Ensure all scripts compile. Remove unsupported .NET APIs. |
| ThirdWeb wallet not connecting in iframe | Ensure same-origin or proper CORS. Use WalletConnect instead of injected. |
| Keccak256 hash mismatch between Unity/JS/Solidity | Ensure identical encoding: `abi.encodePacked(uint256, uint256, bytes32)` — 96 bytes, big-endian |
| Supabase auth fails in Unity | Use `service_role` key in Unity (REST API), not anon key |
| Build size >25MB | Use Addressables, strip modules, crunch textures, remove unused packages |
| iframe not receiving postMessage | Check `window.parent.postMessage` works; ensure iframe `allow-scripts` |
| Score mismatch (Unity vs on-chain) | Verify hash computation is identical. Add unit tests for hash function. |

---

> **Start Here**: Set up Unity project → install ThirdWeb SDK → create the 3 scenes → build the core game loop (Spawner, HitDetection, ScoreManager) → test in editor → add IframeBridge → build WebGL → integrate with React frontend → test end-to-end on QIE testnet.
