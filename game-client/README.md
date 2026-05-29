# Q.I.A Game Client (Unity WebGL)

## Setup Instructions

1. Install Unity 2022.3 LTS or later
2. Open this directory as a Unity project
3. Install ThirdWeb Unity SDK:
   - Download from: https://github.com/thirdweb-dev/unity-sdk
   - Import the `.unitypackage` into the project

## QIE Testnet Configuration

```csharp
// ChainConfig.cs
public static class QIEConfig
{
    public const int ChainId = 1983;
    public const string RPC = "https://rpc1testnet.qie.digital/";
    public const string Explorer = "https://testnet.qie.digital";
    public const string CurrencySymbol = "QIE";
}
```

## Build Settings

- **Platform**: WebGL
- **Target**: Modern browsers (Chrome, Firefox, Edge)
- **Compression**: Brotli (for smaller builds)
- **Max Size**: Target <25MB for fast loading

## Game Architecture

```
game-client/
├── Assets/
│   ├── Scripts/
│   │   ├── Core/           # Game logic (spawner, scoring, hit detection)
│   │   ├── Web3/           # ThirdWeb integration, score signing
│   │   ├── UI/             # HUD, match timer, score display
│   │   └── Network/        # Supabase realtime score sync
│   ├── Prefabs/            # Target prefabs, effects
│   ├── Materials/          # Cyberpunk theme materials
│   ├── Scenes/
│   │   ├── MainMenu.unity
│   │   ├── PracticeMode.unity
│   │   └── Competition.unity
│   └── WebGLTemplates/     # Custom template for embedding
└── ProjectSettings/
```

## Score Signing Flow

1. Player completes match → final score calculated locally
2. Construct metadata hash: `keccak256(abi.encodePacked(matchId, finalScore, salt))`
3. Sign with player's wallet (via ThirdWeb SDK)
4. Submit `(finalScore, metadataHash, signature)` to `CompetitionLobby.submitFinalScore()`

## Offline Practice Mode

- No wallet connection required
- Targets spawn in waves, difficulty increases
- Score tracked locally for personal best

## Integration with Frontend

The Unity WebGL build is embedded in the Next.js frontend via iframe:

```html
<iframe
  src="/game/index.html"
  width="100%"
  height="600"
  allow="autoplay"
  style="border: 1px solid #2a2a3e; border-radius: 12px;"
/>
```

Communication between Unity and frontend via `postMessage`:
- Unity → Frontend: Final score + signature
- Frontend → Unity: Match ID, duration, player addresses
