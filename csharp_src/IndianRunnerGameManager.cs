using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace SubwayPreethi.Runner
{
    /// <summary>
    /// IndianRunnerGameManager.cs
    /// Master game state controller for Subway Preethi Indian Runner in C#:
    /// - Locks screen orientation to portrait
    /// - Tracks Score, Coins, Distance, Highscore (persisted via PlayerPrefs)
    /// - Coordinates UI transitions & restart
    /// </summary>
    public class IndianRunnerGameManager : MonoBehaviour
    {
        public static IndianRunnerGameManager Instance { get; private set; }

        public enum GameState { Menu, Playing, GameOver }
        public GameState CurrentState { get; private set; } = GameState.Menu;

        [Header("Game Stats")]
        public float score = 0;
        public int coins = 0;
        public float distance = 0;
        public int highScore = 0;

        [Header("UI References")]
        public GameObject menuPanel;
        public GameObject hudPanel;
        public GameObject gameOverPanel;
        public Text scoreText;
        public Text coinsText;
        public Text distanceText;
        public Text finalScoreText;
        public Text finalCoinsText;
        public Text highScoreText;

        [Header("Player")]
        public PreethiCharacterController playerController;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);

            // Lock to portrait mode on mobile devices
            Screen.orientation = ScreenOrientation.Portrait;
            highScore = PlayerPrefs.GetInt("Preethi_HighScore", 0);
        }

        private void Start()
        {
            ShowMenu();
        }

        private void Update()
        {
            if (CurrentState == GameState.Playing && playerController != null)
            {
                distance = playerController.transform.position.z;
                score += Time.deltaTime * playerController.forwardSpeed * 1.5f;

                if (scoreText != null) scoreText.text = Mathf.FloorToInt(score).ToString();
                if (coinsText != null) coinsText.text = coins.ToString();
                if (distanceText != null) distanceText.text = $"{Mathf.FloorToInt(distance)}m";
            }
        }

        public void StartGame()
        {
            CurrentState = GameState.Playing;
            if (menuPanel != null) menuPanel.SetActive(false);
            if (gameOverPanel != null) gameOverPanel.SetActive(false);
            if (hudPanel != null) hudPanel.SetActive(true);
        }

        public void AddCoin()
        {
            coins++;
            score += 60;
        }

        public void GameOver()
        {
            CurrentState = GameState.GameOver;
            if (hudPanel != null) hudPanel.SetActive(false);

            if (score > highScore)
            {
                highScore = Mathf.FloorToInt(score);
                PlayerPrefs.SetInt("Preethi_HighScore", highScore);
                PlayerPrefs.Save();
            }

            if (finalScoreText != null) finalScoreText.text = Mathf.FloorToInt(score).ToString();
            if (finalCoinsText != null) finalCoinsText.text = coins.ToString();
            if (highScoreText != null) highScoreText.text = highScore.ToString();

            if (gameOverPanel != null) gameOverPanel.SetActive(true);
        }

        public void RestartGame()
        {
            SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
        }

        public void ShowMenu()
        {
            CurrentState = GameState.Menu;
            if (menuPanel != null) menuPanel.SetActive(true);
            if (hudPanel != null) hudPanel.SetActive(false);
            if (gameOverPanel != null) gameOverPanel.SetActive(false);
        }
    }
}
