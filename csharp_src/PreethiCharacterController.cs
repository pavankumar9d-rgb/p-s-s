using System.Collections;
using UnityEngine;

namespace SubwayPreethi.Runner
{
    /// <summary>
    /// PreethiCharacterController.cs
    /// Controls the 3D Preethi runner in Unity with Mixamo animations,
    /// 3-lane movement (-2, 0, 2), jumping, and sliding mechanics.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PreethiCharacterController : MonoBehaviour
    {
        [Header("Lane Settings")]
        public float[] lanes = new float[] { -2.0f, 0.0f, 2.0f };
        public int currentLane = 1; // 0 = Left, 1 = Center, 2 = Right
        public float laneSwitchSpeed = 16.0f;
        public float laneRollAngle = 10.0f;

        [Header("Movement & Physics")]
        public float forwardSpeed = 22.0f;
        public float maxSpeed = 50.0f;
        public float speedAcceleration = 0.05f;
        public float jumpForce = 12.5f;
        public float gravity = 36.0f;

        [Header("Sliding Settings")]
        public float slideDuration = 0.7f;
        private float originalControllerHeight;
        private Vector3 originalControllerCenter;
        public float slideControllerHeight = 0.6f;

        [Header("Animation")]
        public Animator animator;
        private static readonly int AnimRun = Animator.StringToHash("IsRunning");
        private static readonly int AnimJump = Animator.StringToHash("Jump");
        private static readonly int AnimSlide = Animator.StringToHash("Slide");
        private static readonly int AnimCrash = Animator.StringToHash("Crash");

        private CharacterController controller;
        private float verticalVelocity = 0.0f;
        private bool isSliding = false;
        private float targetX = 0.0f;
        private bool isAlive = true;

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
            // Lane switching (Keyboard & Swipe)
            if (Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.LeftArrow))
            {
                ChangeLane(-1);
            }
            else if (Input.GetKeyDown(KeyCode.D) || Input.GetKeyDown(KeyCode.RightArrow))
            {
                ChangeLane(1);
            }

            // Jump
            if ((Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.Space)) && controller.isGrounded && !isSliding)
            {
                Jump();
            }

            // Slide
            if ((Input.GetKeyDown(KeyCode.S) || Input.GetKeyDown(KeyCode.DownArrow)) && controller.isGrounded && !isSliding)
            {
                StartCoroutine(PerformSlide());
            }
        }

        public void ChangeLane(int direction)
        {
            int nextLane = currentLane + direction;
            if (nextLane >= 0 && nextLane < lanes.Length)
            {
                currentLane = nextLane;
                targetX = lanes[currentLane];
            }
        }

        public void Jump()
        {
            verticalVelocity = jumpForce;
            if (animator != null) animator.SetTrigger(AnimJump);
        }

        private IEnumerator PerformSlide()
        {
            isSliding = true;
            if (animator != null) animator.SetTrigger(AnimSlide);

            // Resize collider for sliding under obstacles
            controller.height = slideControllerHeight;
            controller.center = new Vector3(0, slideControllerHeight * 0.5f, 0);

            yield return new WaitForSeconds(slideDuration);

            // Restore original collider size
            controller.height = originalControllerHeight;
            controller.center = originalControllerCenter;
            isSliding = false;
        }

        private void ApplyMovement()
        {
            // Forward speed increase
            forwardSpeed = Mathf.Min(maxSpeed, forwardSpeed + speedAcceleration * Time.deltaTime);

            // X Position smoothing
            Vector3 currentPos = transform.position;
            float newX = Mathf.Lerp(currentPos.x, targetX, Time.deltaTime * laneSwitchSpeed);

            // Subtle bank roll
            float xDiff = targetX - currentPos.x;
            transform.rotation = Quaternion.Euler(0, 0, -xDiff * laneRollAngle);

            // Gravity & Vertical movement
            if (controller.isGrounded && verticalVelocity < 0.0f)
            {
                verticalVelocity = -1.5f; // Stick to ground
            }
            else
            {
                verticalVelocity -= gravity * Time.deltaTime;
            }

            // Combined motion vector
            Vector3 move = new Vector3(newX - currentPos.x, verticalVelocity * Time.deltaTime, forwardSpeed * Time.deltaTime);
            controller.Move(move);
        }

        public void OnCrash()
        {
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
        }
    }
}

