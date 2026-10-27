using System.Collections;
using UnityEngine;

namespace SubwayPreethi.Runner
{
    /// <summary>
    /// PreethiCharacterController.cs
    /// Controls the 3D Preethi runner in Unity with Mixamo animations,
    /// 3-lane movement (-2, 0, 2), jumping, fast-fall dive, sliding, and hoverboard shield.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PreethiCharacterController : MonoBehaviour
    {
        [Header("Lane Settings")]
        public float[] lanes = new float[] { -2.0f, 0.0f, 2.0f };
        public int currentLane = 1; // 0 = Left, 1 = Center, 2 = Right
        public float laneSwitchSpeed = 18.0f;
        public float laneRollAngle = 10.0f;
        public float laneYawAngle = 12.0f;

        [Header("Movement & Physics")]
        public float forwardSpeed = 20.0f;
        public float maxSpeed = 48.0f;
        public float speedAcceleration = 0.045f;
        public float jumpForce = 15.2f;
        public float diveForce = -34.0f;
        public float gravity = 46.0f;

        [Header("Sliding Settings")]
        public float slideDuration = 0.75f;
        private float originalControllerHeight;
        private Vector3 originalControllerCenter;
        public float slideControllerHeight = 0.65f;

        [Header("Powerups & Buffs")]
        public bool hasHoverboard = false;
        public float hoverboardDuration = 25.0f;
        public GameObject hoverboardModel;
        public bool hasMagnet = false;
        public float magnetDuration = 10.0f;
        public bool isInvincible = false;

        [Header("Animation")]
        public Animator animator;
        private static readonly int AnimRun = Animator.StringToHash("IsRunning");
        private static readonly int AnimJump = Animator.StringToHash("Jump");
        private static readonly int AnimSlide = Animator.StringToHash("Slide");
        private static readonly int AnimCrash = Animator.StringToHash("Crash");
        private static readonly int AnimDodgeLeft = Animator.StringToHash("DodgeLeft");
        private static readonly int AnimDodgeRight = Animator.StringToHash("DodgeRight");

        private CharacterController controller;
        private float verticalVelocity = 0.0f;
        private bool isSliding = false;
        private bool divePendingSlide = false;
        private float targetX = 0.0f;
        private bool isAlive = true;
        private Coroutine slideCoroutine;

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            originalControllerHeight = controller.height;
            originalControllerCenter = controller.center;
        }

        private void Start()
        {
            targetX = lanes[currentLane];
            if (animator != null)
            {
                animator.SetBool(AnimRun, true);
            }
        }

        private void Update()
        {
            if (!isAlive) return;

            HandleInput();
            ApplyMovement();
        }

        private void HandleInput()
        {
            // Lane switching
            if (Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.LeftArrow))
            {
                ChangeLane(-1);
            }
            else if (Input.GetKeyDown(KeyCode.D) || Input.GetKeyDown(KeyCode.RightArrow))
            {
                ChangeLane(1);
            }

            // Jump
            if (Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.Space))
            {
                Jump();
            }

            // Slide & Fast-Fall Dive
            if (Input.GetKeyDown(KeyCode.S) || Input.GetKeyDown(KeyCode.DownArrow))
            {
                Slide();
            }

            // Activate Hoverboard
            if (Input.GetKeyDown(KeyCode.E))
            {
                ActivateHoverboard();
            }
        }

        public void ChangeLane(int direction)
        {
            int nextLane = Mathf.Clamp(currentLane + direction, 0, lanes.Length - 1);
            if (nextLane != currentLane)
            {
                currentLane = nextLane;
                targetX = lanes[currentLane];

                if (controller.isGrounded && !isSliding && animator != null)
                {
                    animator.SetTrigger(direction > 0 ? AnimDodgeRight : AnimDodgeLeft);
                }
            }
        }

        public void Jump()
        {
            // Jump cancels slide immediately (Subway Surfers standard)
            if (isSliding)
            {
                StopSlide();
            }

            if (controller.isGrounded)
            {
                verticalVelocity = jumpForce;
                if (animator != null) animator.SetTrigger(AnimJump);
            }
        }

        public void Slide()
        {
            // Air dive / fast fall
            if (!controller.isGrounded)
            {
                verticalVelocity = diveForce;
                divePendingSlide = true;
                return;
            }

            if (!isSliding)
            {
                slideCoroutine = StartCoroutine(PerformSlide());
            }
        }

        private void StopSlide()
        {
            if (slideCoroutine != null) StopCoroutine(slideCoroutine);
            controller.height = originalControllerHeight;
            controller.center = originalControllerCenter;
            isSliding = false;
        }

        private IEnumerator PerformSlide()
        {
            isSliding = true;
            if (animator != null) animator.SetTrigger(AnimSlide);

            // Squash collider for clearance under high obstacles
            controller.height = slideControllerHeight;
            controller.center = new Vector3(0, slideControllerHeight * 0.5f, 0);

            yield return new WaitForSeconds(slideDuration);

            // Restore original collider size
            controller.height = originalControllerHeight;
            controller.center = originalControllerCenter;
            isSliding = false;
        }

        public void ActivateHoverboard()
        {
            hasHoverboard = true;
            if (hoverboardModel != null) hoverboardModel.SetActive(true);
            StartCoroutine(HoverboardCountdown());
        }

        private IEnumerator HoverboardCountdown()
        {
            yield return new WaitForSeconds(hoverboardDuration);
            BreakHoverboardShield();
        }

        public void BreakHoverboardShield()
        {
            hasHoverboard = false;
            if (hoverboardModel != null) hoverboardModel.SetActive(false);
            StartCoroutine(InvulnerabilityGrace(1.8f));
        }

        private IEnumerator InvulnerabilityGrace(float duration)
        {
            isInvincible = true;
            yield return new WaitForSeconds(duration);
            isInvincible = false;
        }

        private void ApplyMovement()
        {
            // Forward speed ramping
            forwardSpeed = Mathf.Min(maxSpeed, forwardSpeed + speedAcceleration * Time.deltaTime);

            // Dynamic stride rate: sync animator playback speed to forward ground velocity
            if (animator != null)
            {
                animator.speed = Mathf.Max(1.0f, forwardSpeed / 19.5f);
            }

            // Snappy lane switching
            Vector3 currentPos = transform.position;
            float newX = Mathf.Lerp(currentPos.x, targetX, Time.deltaTime * laneSwitchSpeed);

            // Athletic lean & banking
            float xDiff = targetX - currentPos.x;
            transform.rotation = Quaternion.Euler(0, xDiff * laneYawAngle, -xDiff * laneRollAngle);

            // Gravity & Vertical movement
            if (controller.isGrounded && verticalVelocity < 0.0f)
            {
                verticalVelocity = -2.0f; // Ground stick
                if (divePendingSlide)
                {
                    divePendingSlide = false;
                    Slide();
                }
            }
            else
            {
                verticalVelocity -= gravity * Time.deltaTime;
            }

            Vector3 move = new Vector3(newX - currentPos.x, verticalVelocity * Time.deltaTime, forwardSpeed * Time.deltaTime);
            controller.Move(move);
        }

        public void OnCrash()
        {
            if (isInvincible) return;

            // Hoverboard shield absorbs collision!
            if (hasHoverboard)
            {
                BreakHoverboardShield();
                return;
            }

            isAlive = false;
            forwardSpeed = 0.0f;
            if (animator != null) animator.SetTrigger(AnimCrash);
            IndianRunnerGameManager.Instance?.GameOver();
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Obstacle"))
            {
                OnCrash();
            }
            else if (other.CompareTag("Coin"))
            {
                other.gameObject.SetActive(false);
                IndianRunnerGameManager.Instance?.AddCoin();
            }
            else if (other.CompareTag("Powerup"))
            {
                other.gameObject.SetActive(false);
                ActivateHoverboard();
            }
        }
    }
}
